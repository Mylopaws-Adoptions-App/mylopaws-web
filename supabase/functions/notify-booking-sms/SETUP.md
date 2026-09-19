# Ops "new booking" notification fallback — setup

Notifies the ops team over **SMS**, **WhatsApp**, or **both** when a booking becomes **paid** *and*
**no ops board is open** (a fresh `ops_presence` heartbeat means the in-app board alert already
covered it, so no message is sent).

## How it fits together
1. **Boards** (`NewBookingAlert`) heartbeat `ops_presence` every ~30s while open.
2. **DB trigger** `notify_new_paid_booking` fires on any path that flips `payment_status='paid'`,
   POSTing `{order_type, order_id}` to the `notify-booking-sms` edge function (auth: shared secret
   `app_config.ops_alert_secret`). It's bulletproof — alerting errors never affect the booking.
3. **Edge fn** `notify-booking-sms`: skips if a board is open (fresh presence) or already alerted;
   otherwise sends via the configured channel(s) via Twilio, then stamps `sms_alerted_at` (idempotent).

## Channel selection

Set `app_config.ops_alert_channel` to one of `sms` | `whatsapp` | `both` (default `sms`).

```sql
update public.app_config set value = to_jsonb('whatsapp'::text) where key = 'ops_alert_channel';
-- or 'sms' or 'both'
```

## Already done (in this branch / applied to the project)
- `pg_net` enabled; `ops_presence` (+RLS); `sms_alerted_at` columns; `app_config` keys
  `ops_alert_secret` (auto-generated), `ops_alert_phones`, `ops_alert_channel`,
  `ops_alert_whatsapp_content_sid`, `ops_alert_whatsapp_variable_order`.
- Trigger **function** created (bulletproof). Edge fn `notify-booking-sms` deployed with
  `verify_jwt: false`. Boards write presence heartbeats.

## Owner steps to switch it on

### 1. Recipients (shared across channels)

```sql
update public.app_config
set value = '["+919XXXXXXXXX","+919YYYYYYYYY"]'::jsonb
where key = 'ops_alert_phones';
```

### 2. Twilio credentials (Supabase → Edge Functions → Secrets)

Common:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`

For **SMS**:
- `TWILIO_MESSAGING_SERVICE_SID` (recommended) or `TWILIO_SMS_FROM`
- The messaging service must have an **Indian sender** attached (long code / short code /
  DLT-registered Sender ID) and be linked to your DLT entity/template IDs.

For **WhatsApp**:
- `TWILIO_WHATSAPP_MESSAGING_SERVICE_SID` (recommended) or `TWILIO_WHATSAPP_FROM`
  (e.g. `whatsapp:+14155238886` for sandbox or `whatsapp:+91XXXXXXXXXX` for business-verified).
- WhatsApp business-initiated outbound requires an **approved Content template** — see step 3b.

Same messaging service can carry both an SMS sender and a WhatsApp sender if you prefer to keep
one service; then set both `TWILIO_MESSAGING_SERVICE_SID` and `TWILIO_WHATSAPP_MESSAGING_SERVICE_SID`
to the same MG… SID.

### 3a. SMS: India DLT template

Register a transactional template on the operator DLT portal (same one you used for OTPs; this is
a *new* template). Body should be:

```
New Mylopaws {#var#} booking #{#var#} from {#var#}. Open the Ops board to assign. - Mylopaws
```

Once DLT-approved, store the exact text:

```sql
update public.app_config
set value = to_jsonb('<your DLT-approved text with {id} {type} {name}>'::text)
where key = 'ops_alert_sms_template';
```

### 3b. WhatsApp: Twilio Content template

WhatsApp business-initiated outbound must use a Meta-approved template. In Twilio:

1. **Content Editor** → Create a template of type `twilio/text` (or `twilio/quick-reply`, etc.).
2. Body — with positional variables `{{1}} {{2}} {{3}}`:
   ```
   New Mylopaws {{1}} booking #{{2}} from {{3}}. Open the Ops board to assign. - Mylopaws
   ```
3. Category: `Utility` (transactional). Submit for WhatsApp approval.
4. Once approved, note the **Content SID** (starts with `HX…`).

Store the SID:

```sql
update public.app_config
set value = to_jsonb('HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'::text)
where key = 'ops_alert_whatsapp_content_sid';
```

Variable order (default `["type","id","name"]` → maps to `{{1}} {{2}} {{3}}` in that order):

```sql
update public.app_config
set value = '["type","id","name"]'::jsonb
where key = 'ops_alert_whatsapp_variable_order';
```

### 4. Attach the trigger

Run `ops_sms_alert_trigger.GO_LIVE_ONLY.sql` **only after** the branch is deployed (so presence is
being written) and at least one channel is fully configured (recipients + Twilio secrets +
template).

## Test

- With a board **open**: mark a booking paid → edge fn returns `skipped:'board_open'` (no message).
- With **all boards closed** and no config → `skipped:'twilio_unconfigured'` / `'no_recipients'` /
  `'no_channel_available'` — all safe no-ops.
- With **all boards closed** and SMS configured → SMS delivered; `sms_alerted_at` set.
- With **all boards closed** and WhatsApp configured → WhatsApp message delivered; `sms_alerted_at`
  set (column is retained despite the multi-channel name to avoid a rename migration).
