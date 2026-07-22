-- BOOKING-WINDOW ENFORCEMENT — APPLY ONLY AT GO-LIVE (when the branch merges to main).
--
-- ⚠️ Do NOT apply this while the currently-deployed customer app still offers a 10-day date
-- picker: it would reject legitimate bookings for days 3–9 and break checkout in production.
-- Apply it in the same change as merging feat/travel-reschedule-refund (which ships the
-- 3-day picker). Runs on INSERT only, so admin reschedules (UPDATEs) are never blocked.
--
-- Window: today + the next 2 days, evaluated in IST (Asia/Kolkata) to match Bengaluru users.

create or replace function public.enforce_travel_booking_window()
returns trigger
language plpgsql
as $$
declare
  ist_today date := (now() at time zone 'Asia/Kolkata')::date;
  travel_day date;
begin
  begin
    travel_day := to_date(new.date_of_travel, 'YYYY-MM-DD');
  exception when others then
    raise exception 'Invalid travel date format: %', new.date_of_travel;
  end;

  if travel_day < ist_today or travel_day > ist_today + 2 then
    raise exception 'Bookings are only allowed for today through % (got %).', ist_today + 2, travel_day
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_travel_window on public.orders;
create trigger orders_travel_window
  before insert on public.orders
  for each row execute function public.enforce_travel_booking_window();
