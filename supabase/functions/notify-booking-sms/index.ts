import { createClient } from 'jsr:@supabase/supabase-js@2';

// Fired by the notify_new_paid_booking DB trigger the moment a booking becomes paid. Texts the ops
// team ONLY when no ops board is currently open (a fresh ops_presence heartbeat means the in-app
// alert already reached someone, so we don't double-notify / burn SMS). Idempotent via
// orders.sms_alerted_at. verify_jwt is off — the DB trigger authenticates with a shared secret
// (app_config.ops_alert_secret) that we verify here; the function is otherwise a no-op.
//
// Owner setup required for real delivery:
//   • Edge secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID
//     (or TWILIO_SMS_FROM). India SMS also needs a DLT-approved transactional template.
//   • app_config.ops_alert_phones : JSON array of E.164 recipients, e.g. ["+9198...","+9199..."].
//   • (optional) app_config.ops_alert_sms_template : text with {id} {type} {name} placeholders,
//     matching your DLT-approved template. A sensible default is used if unset.

const PRESENCE_WINDOW_SEC = 120; // board heartbeats every ~30s; 120s tolerates background-tab timer throttling
const DEFAULT_TEMPLATE = 'New Mylopaws {type} booking #{id} from {name}. Open the Ops board to assign. - Mylopaws';

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

    // Board open? A fresh heartbeat means the in-app alert covered it — don't SMS.
    const since = new Date(Date.now() - PRESENCE_WINDOW_SEC * 1000).toISOString();
    const { count } = await admin.from('ops_presence').select('*', { count: 'exact', head: true }).gte('last_seen', since);
    if ((count ?? 0) > 0) return json({ skipped: 'board_open' });

    // Recipients + optional template override.
    const { data: phonesRow } = await admin.from('app_config').select('value').eq('key', 'ops_alert_phones').single();
    const recipients: string[] = Array.isArray(phonesRow?.value) ? phonesRow!.value : [];
    if (recipients.length === 0) return json({ skipped: 'no_recipients' });

    const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const token = Deno.env.get('TWILIO_AUTH_TOKEN');
    const msgService = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');
    const from = Deno.env.get('TWILIO_SMS_FROM');
    if (!sid || !token || (!msgService && !from)) return json({ skipped: 'twilio_unconfigured' });

    const { data: tplRow } = await admin.from('app_config').select('value').eq('key', 'ops_alert_sms_template').single();
    const template = (typeof tplRow?.value === 'string' && tplRow.value) || DEFAULT_TEMPLATE;
    const name = order.pawparent_name || order.furbaby_name || 'a customer';
    const bodyText = template.replace('{id}', String(order.id)).replace('{type}', order_type).replace('{name}', name);

    let sent = 0;
    for (const to of recipients) {
      const form = new URLSearchParams();
      if (msgService) form.set('MessagingServiceSid', msgService); else form.set('From', from!);
      form.set('To', to);
      form.set('Body', bodyText);
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      if (res.ok) sent++; else console.error('twilio send failed', to, res.status, await res.text());
    }

    // Mark alerted so a retried trigger/webhook can't double-text.
    await admin.from(table).update({ sms_alerted_at: new Date().toISOString() }).eq('id', order_id);
    return json({ ok: true, sent, recipients: recipients.length });
  } catch (e) {
    console.error('notify-booking-sms error', e);
    return json({ error: String((e as Error)?.message ?? e) }, 400);
  }
});
