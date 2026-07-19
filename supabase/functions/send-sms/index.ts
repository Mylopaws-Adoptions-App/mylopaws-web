// Supabase Auth "Send SMS" hook → delivers the OTP via MSG91 (India DLT).
//
// Supabase mints the OTP and POSTs it here (Standard Webhooks-signed) whenever a user requests a
// phone login. We forward it to MSG91's Flow API using a DLT-approved template. Supabase still owns
// OTP generation + verifyOtp(), so MSG91 is used purely as the SMS transport.
//
// ── One-time owner setup (out of band, required before phone login works in prod) ──
//   1. MSG91 account → complete TRAI DLT: register entity, header (sender ID), and an OTP template
//      whose body contains an {{otp}}/##OTP## variable. Note the DLT-approved template_id.
//   2. Supabase → Authentication → Providers → enable "Phone".
//   3. Supabase → Authentication → Hooks → "Send SMS" → point to this function's URL, and copy the
//      generated hook secret (starts with `v1,whsec_...`).
//   4. Set these function secrets (Dashboard → Edge Functions → Secrets, or `supabase secrets set`):
//        SEND_SMS_HOOK_SECRET = <the v1,whsec_... secret from step 3>
//        MSG91_AUTHKEY        = <MSG91 auth key>
//        MSG91_TEMPLATE_ID    = <DLT-approved template id from step 1>
//   5. Deploy:  supabase functions deploy send-sms   (or via the Supabase MCP deploy tool).
//
// The MSG91 Flow template must expose the OTP as a variable named `otp` (##OTP##). Adjust the
// `recipients` payload below if your template uses a different variable name.

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const HOOK_SECRET = Deno.env.get('SEND_SMS_HOOK_SECRET') ?? '';
const MSG91_AUTHKEY = Deno.env.get('MSG91_AUTHKEY') ?? '';
const MSG91_TEMPLATE_ID = Deno.env.get('MSG91_TEMPLATE_ID') ?? '';

interface SendSmsPayload {
  user: { phone: string };
  sms: { otp: string };
}

Deno.serve(async (req) => {
  try {
    const raw = await req.text();

    // Verify the Standard Webhooks signature so only Supabase Auth can trigger an SMS (prevents
    // toll fraud). The secret's base64 portion is what the Webhook verifier expects.
    const wh = new Webhook(HOOK_SECRET.replace('v1,whsec_', ''));
    const { user, sms } = wh.verify(raw, {
      'webhook-id': req.headers.get('webhook-id')!,
      'webhook-timestamp': req.headers.get('webhook-timestamp')!,
      'webhook-signature': req.headers.get('webhook-signature')!,
    }) as SendSmsPayload;

    // Supabase gives E.164 without '+', e.g. "919876543210" — exactly MSG91's `mobiles` format.
    const mobile = user.phone.replace(/\D/g, '');

    const res = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json', authkey: MSG91_AUTHKEY },
      body: JSON.stringify({
        template_id: MSG91_TEMPLATE_ID,
        short_url: '0',
        recipients: [{ mobiles: mobile, otp: sms.otp }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('MSG91 send failed', res.status, detail);
      return new Response(JSON.stringify({ error: { message: 'SMS delivery failed' } }), {
        status: 502, headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('send-sms hook error', e);
    // A non-2xx tells Supabase Auth the SMS wasn't sent, so the user sees a clean failure.
    return new Response(JSON.stringify({ error: { message: 'Invalid request' } }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
});
