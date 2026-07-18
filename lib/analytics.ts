// Thin, typed wrapper over GA4's gtag for NAMED / semantic events — the meaningful business
// actions you build funnels and conversion reports on (booking_start, begin_checkout, purchase,
// login, …). This is complementary to components/AnalyticsClickTracker.tsx, which already logs a
// generic `interaction` event on every click; use track() when an action has real meaning.
//
// Safe to call anywhere: it no-ops on the server and before gtag has loaded (the event is simply
// dropped rather than throwing). Every funnel event should carry a `vertical` so travel, dermacare
// and homes can be compared side by side in one funnel exploration.

type GtagFn = (...args: unknown[]) => void;

export type Vertical = 'travel' | 'dermacare' | 'homes';

export type EventParams = Record<string, string | number | boolean | undefined>;

export function track(event: string, params: EventParams = {}): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: GtagFn }).gtag;
  if (!gtag) return;
  // Strip undefined so GA4 doesn't record empty params.
  const clean: EventParams = {};
  for (const [k, v] of Object.entries(params)) if (v !== undefined) clean[k] = v;
  gtag('event', event, clean);
}
