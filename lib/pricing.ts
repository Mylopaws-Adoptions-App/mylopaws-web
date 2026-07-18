'use client';
import { supabase } from '@/lib/supabase';

/**
 * Live pricing for the pre-login landing hooks, sourced from the SAME rows checkout uses,
 * so the marketing numbers can never drift from the actual prices again.
 *
 *  - fullServiceFrom  ← services."Full Service".base_price  (anon-readable: services_read = active OR admin)
 *  - travelFrom       ← app_config.fare.booking_fee          (anon-readable via cfg_read_fare_public)
 *
 * Both queries run with the anon key on the landing page. Fallbacks match the current live
 * values so the page still renders sensible numbers if a fetch fails (offline / cold DB).
 */
export type LandingPrices = { fullServiceFrom: number; travelFrom: number };

export const LANDING_PRICE_FALLBACK: LandingPrices = { fullServiceFrom: 1299, travelFrom: 250 };

export async function getLandingPrices(): Promise<LandingPrices> {
  const [svc, cfg] = await Promise.all([
    supabase.from('services').select('base_price').eq('name', 'Full Service').eq('active', true).maybeSingle(),
    supabase.from('app_config').select('value').eq('key', 'fare').maybeSingle(),
  ]);

  const fullServiceFrom = Number(svc.data?.base_price) || LANDING_PRICE_FALLBACK.fullServiceFrom;
  const bookingFee = (cfg.data?.value as { booking_fee?: number } | null)?.booking_fee;
  const travelFrom = Number(bookingFee) || LANDING_PRICE_FALLBACK.travelFrom;

  return { fullServiceFrom, travelFrom };
}
