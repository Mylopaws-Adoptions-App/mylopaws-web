# Ops "new booking" SMS fallback — setup

Texts the ops team when a booking becomes **paid** *and* **no ops board is open** (a fresh
`ops_presence` heartbeat means the in-app board alert already covered it, so no SMS is sent).

## How it fits together
1. **Boards** (`NewBookingAlert`) heartbeat `ops_presence` every ~30s while open.
2. **DB trigger** `notify_new_paid_booking` fires on any path that flips `payment_status='paid'`,
   POSTing `{order_type, order_id}` to the `notify-booking-sms` edge function (auth: shared secret
   `app_config.ops_alert_secret`). It's bulletproof — alerting errors never affect the booking.
3. **Edge fn** `notify-booking-sms`: skips if a board is open (fresh presence) or already alerted;
   otherwise texts every number in `app_config.ops_alert_phones` via Twilio, then stamps
   `sms_alerted_at` (idempotent).

## Already done (in this branch / applied to the project)
- `pg_net` enabled; `ops_presence` (+RLS); `sms_alerted_at` columns; `app_config` keys
  `ops_alert_secret` (auto-generated) and `ops_alert_phones` (`[]`).
- Trigger **function** created (bulletproof). Edge fn `notify-booking-sms` deployed (verify_jwt off).
- Boards write presence heartbeats.

## Owner steps to switch it on
1. **Recipients** — set the team numbers (E.164):
   ```sql
   update public.app_config set value = '["+919XXXXXXXXX","+919YYYYYYYYY"]'::jsonb
   where key = 'ops_alert_phones';
   ```
2. **Twilio edge secrets** (Supabase → Edge Functions → Secrets):
   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_MESSAGING_SERVICE_SID` (or `TWILIO_SMS_FROM`).
3. **India DLT** — register a **transactional template** for the alert text and map it to the sender
   (same regime as the OTP template; this is a *new* template). Then set the matching text:
   ```sql
   update public.app_config set value = to_jsonb('<your DLT-approved text with {id} {type} {name}>'::text)
   where key = 'ops_alert_sms_template';   -- optional; a sensible default is used if unset
   ```
4. **Attach the trigger** — run `ops_sms_alert_trigger.GO_LIVE_ONLY.sql` (only after 1–3 and after the
   boards are deployed so presence is being written).

## Test
- With a board **open**: mark a booking paid → edge fn returns `skipped:'board_open'` (no SMS).
- With **all boards closed**: mark a booking paid → SMS to `ops_alert_phones`; `sms_alerted_at` set.
- Before Twilio/recipients are set, the edge fn returns `skipped:'twilio_unconfigured'` / `'no_recipients'` — safe.
