'use client';
// Loads the Google Maps JS SDK once (Places lib). Browser REST calls to Places/Directions
// are CORS-blocked, so on web everything goes through this SDK.
//
// The key comes from process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY. Because NEXT_PUBLIC_* is
// inlined at BUILD time, a missing/updated key requires a redeploy — see MAPS-SETUP.md.

let loading: Promise<any> | null = null;
let authError: string | null = null;

/** Raised (rejected) when the key env var is missing at runtime, so the UI can show an exact message. */
export class MapsKeyMissingError extends Error {
  constructor() { super('NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set'); this.name = 'MapsKeyMissingError'; }
}

/** Returns a human error string if Google rejected the key (invalid/referrer/billing/API-not-enabled), else null. */
export function getMapsAuthError(): string | null { return authError; }

export function loadMaps(): Promise<any> {
  if (typeof window === 'undefined') return new Promise(() => {});

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) {
    console.error('[maps] NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set — the Maps SDK cannot load. ' +
      'Set it in Vercel (Project → Settings → Environment Variables) and redeploy; NEXT_PUBLIC_* is inlined at build time.');
    return Promise.reject(new MapsKeyMissingError());
  }

  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (loading) return loading;

  // Google invokes this global on auth failures (invalid key, referrer not allowed, billing
  // disabled, API not enabled). It doesn't pass us the reason, but Google logs the exact code
  // (e.g. RefererNotAllowedMapError / ApiNotActivatedMapError / BillingNotEnabledMapError) to the
  // console right before calling this — surface both.
  (window as any).gm_authFailure = () => {
    authError = 'Google Maps rejected the API key. Check the HTTP-referrer restrictions, that billing is enabled, and that the Maps JavaScript / Places / Directions APIs are turned on.';
    console.error('[maps] gm_authFailure —', authError,
      '\n→ See the Google Maps error logged just above for the exact reason code (RefererNotAllowedMapError, ApiNotActivatedMapError, BillingNotEnabledMapError, InvalidKeyMapError). Fix it per MAPS-SETUP.md.');
  };

  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    (window as any).__mapsReady = () => resolve((window as any).google);
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=__mapsReady`;
    s.onerror = () => {
      authError = 'Google Maps script failed to load (network error or blocked request).';
      console.error('[maps]', authError);
      reject(new Error(authError));
    };
    document.head.appendChild(s);
  });
  return loading;
}
