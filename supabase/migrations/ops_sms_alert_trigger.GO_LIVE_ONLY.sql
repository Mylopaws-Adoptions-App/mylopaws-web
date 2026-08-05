-- ATTACH the new-booking SMS trigger. APPLY ONLY AT GO-LIVE, and only AFTER:
--   1. the branch feat/ops-sms-alert is merged/deployed (so the ops boards write ops_presence
--      heartbeats — otherwise presence is always empty and every paid booking would SMS), and
--   2. Twilio edge secrets + a DLT-approved template + app_config.ops_alert_phones are set
--      (until then the edge fn safely no-ops with skipped:'twilio_unconfigured' / 'no_recipients').
--
-- The trigger function public.notify_new_paid_booking() is already created and is bulletproof
-- (all alerting errors are swallowed, so it can never roll back a payment update).

drop trigger if exists orders_notify_paid on public.orders;
create trigger orders_notify_paid
  after insert or update on public.orders
  for each row execute function public.notify_new_paid_booking();

drop trigger if exists dermacare_notify_paid on public.dermacare_orders;
create trigger dermacare_notify_paid
  after insert or update on public.dermacare_orders
  for each row execute function public.notify_new_paid_booking();
