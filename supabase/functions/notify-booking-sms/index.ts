import { createClient } from 'jsr:@supabase/supabase-js@2';

// Fired by the notify_new_paid_booking DB trigger the moment a booking becomes paid. Notifies the
// ops team over SMS, WhatsApp, or both — ONLY when no ops board is currently open (a fresh
// ops_presence heartbeat means the in-app alert already reached someone, so we don't
// double-notify / burn a message). Idempotent via orders.sms_alerted_at. verify_jwt is off — the
// DB trigger authenticates with a shared secret (app_config.ops_alert_secret) that we verify
// here; the function is otherwise a no-op.
//
// Channel selection (app_config.ops_alert_channel): 'sms' (default) | 'whatsapp' | 'both'.
// WhatsApp business-initiated outbound requires an approved Content template (Twilio HX SID) —
// stored in app_config.ops_alert_whatsapp_content_sid — because a plain Body is only allowed
// inside the 24h customer-service window.
//
// Owner setup for real delivery:
//   • Edge secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and at least one channel's sender —
//     SMS: TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM.
//     WhatsApp: TWILIO_WHATSAPP_MESSAGING_SERVICE_SID or TWILIO_WHATSAPP_FROM (e.g. 'whatsapp:+14155238886').
//   • app_config.ops_alert_phones : JSON array of E.164 recipients — shared across channels.
//   • app_config.ops_alert_sms_template : SMS body with {id} {type} {name} placeholders (DLT-approved).
//   • app_config.ops_alert_whatsapp_content_sid : Twilio Content SID (HX…) of the approved WA template.
//   • app_config.ops_alert_whatsapp_variable_order : JSON array mapping positional WA template
//     variables to fields, e.g. ["type","id","name"] → {"1":"travel","2":"123","3":"Rahul"}.

const PRESENCE_WINDOW_SEC = 120;
const DEFAULT_SMS_TEMPLATE = 'New Mylopaws {type} booking #{id} from {name}. Open the Ops board to assign. - Mylopaws';
const DEFAULT_WA_VAR_ORDER = ['type', 'id', 'name'] as const;

type Channel = 'sms' | 'whatsapp' | 'both';

Deno.serve(async (req: Request) => {
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Auth: shared secret set by the trigger, verified against app_config (service-role read).
    const { data: secretRow } = await admin.from('app_config').select('value').eq('key', 'ops_alert_secret').single();
    const expected = secretRow?.value as string | undefined;
    if (!expected || req.headers.get('x-alert-secret') !== expected) return json({ error: 'unauthorized' }, 401);

    const { order_type, order_id } = await req.json();
    if (order_type !== 'travel' && order_type !== 'dermacare') return json({ error: 'bad order_type' }, 400);
    const table = order_type === 'travel' ? 'orders' : 'dermacare_orders';

    const { data: order } = await admin.from(table)
      .select('id, sms_alerted_at, pawparent_name, furbaby_name, payment_status').eq('id', order_id).single();
    if (!order) return json({ error: 'order not found' }, 404);
    if (order.sms_alerted_at) return json({ skipped: 'already_alerted' });
    if (order.payment_status !== 'paid') return json({ skipped: 'not_paid' });

    // Board open? A fresh heartbeat means the in-app alert covered it — don't message.
    const since = new Date(Date.now() - PRESENCE_WINDOW_SEC * 1000).toISOString();
    const { count } = await admin.from('ops_presence').select('*', { count: 'exact', head: true }).gte('last_seen', since);
    if ((count ?? 0) > 0) return json({ skipped: 'board_open' });

    // Recipients (shared across channels).
    const { data: phonesRow } = await admin.from('app_config').select('value').eq('key', 'ops_alert_phones').single();
    const recipients: string[] = Array.isArray(phonesRow?.value) ? phonesRow!.value : [];
    if (recipients.length === 0) return json({ skipped: 'no_recipients' });

    // Channel selection.
    const { data: chRow } = await admin.from('app_config').select('value').eq('key', 'ops_alert_channel').single();
    const channel: Channel = ((typeof chRow?.value === 'string' ? chRow.value : 'sms').toLowerCase() as Channel);
    const wantSms = channel === 'sms' || channel === 'both';
    const wantWa = channel === 'whatsapp' || channel === 'both';

    // Twilio auth.
    const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const token = Deno.env.get('TWILIO_AUTH_TOKEN');
    if (!sid || !token) return json({ skipped: 'twilio_unconfigured' });

    // Per-channel sender availability. A single messaging service can carry both SMS and WhatsApp
    // senders; when the WA-specific env is unset we fall back to the shared SMS one so operators
    // don't have to duplicate the same MG SID as two secrets.
    const smsMsgService = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');
    const smsFrom = Deno.env.get('TWILIO_SMS_FROM');
    const waMsgService = Deno.env.get('TWILIO_WHATSAPP_MESSAGING_SERVICE_SID') || smsMsgService;
    const waFrom = Deno.env.get('TWILIO_WHATSAPP_FROM');
    const smsAvailable = wantSms && (smsMsgService || smsFrom);
    const waAvailable = wantWa && (waMsgService || waFrom);
    if (!smsAvailable && !waAvailable) return json({ skipped: 'no_channel_available', channel });

    // Build message payloads.
    const name = order.pawparent_name || order.furbaby_name || 'a customer';
    const varMap: Record<string, string> = { type: order_type, id: String(order.id), name };

    const { data: smsTplRow } = await admin.from('app_config').select('value').eq('key', 'ops_alert_sms_template').single();
    const smsBody = (typeof smsTplRow?.value === 'string' && smsTplRow.value) || DEFAULT_SMS_TEMPLATE;
    const smsText = smsBody.replace('{id}', varMap.id).replace('{type}', varMap.type).replace('{name}', varMap.name);

    const { data: waSidRow } = await admin.from('app_config').select('value').eq('key', 'ops_alert_whatsapp_content_sid').single();
    const waContentSid = typeof waSidRow?.value === 'string' ? waSidRow.value.trim() : '';
    const { data: waVarRow } = await admin.from('app_config').select('value').eq('key', 'ops_alert_whatsapp_variable_order').single();
    const waVarOrder: string[] = Array.isArray(waVarRow?.value) ? waVarRow!.value : [...DEFAULT_WA_VAR_ORDER];
    const waVars: Record<string, string> = {};
    waVarOrder.forEach((k, i) => { waVars[String(i + 1)] = varMap[k] ?? ''; });

    const authHeader = 'Basic ' + btoa(`${sid}:${token}`);
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

    const post = async (form: URLSearchParams) => fetch(twilioUrl, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    let smsSent = 0, waSent = 0;

    for (const to of recipients) {
      if (smsAvailable) {
        const f = new URLSearchParams();
        if (smsMsgService) f.set('MessagingServiceSid', smsMsgService); else f.set('From', smsFrom!);
        f.set('To', to);
        f.set('Body', smsText);
        const res = await post(f);
        if (res.ok) smsSent++; else console.error('sms send failed', to, res.status, await res.text());
      }
      if (waAvailable) {
        if (!waContentSid) { console.error('wa skipped: no ops_alert_whatsapp_content_sid'); continue; }
        const f = new URLSearchParams();
        if (waMsgService) f.set('MessagingServiceSid', waMsgService); else f.set('From', waFrom!);
        f.set('To', `whatsapp:${to}`);
        f.set('ContentSid', waContentSid);
        f.set('ContentVariables', JSON.stringify(waVars));
        const res = await post(f);
        if (res.ok) waSent++; else console.error('wa send failed', to, res.status, await res.text());
      }
    }

    // Stamp regardless of per-recipient outcome so a retried trigger can't double-notify.
    await admin.from(table).update({ sms_alerted_at: new Date().toISOString() }).eq('id', order_id);
    return json({ ok: true, channel, sms_sent: smsSent, whatsapp_sent: waSent, recipients: recipients.length });
  } catch (e) {
    console.error('notify-booking-sms error', e);
    return json({ error: String((e as Error)?.message ?? e) }, 400);
  }
});
