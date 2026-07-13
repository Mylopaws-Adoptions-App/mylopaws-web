'use client';
// Google Maps integration for the web app.
//
// Our GCP project is post-March-2025, so the LEGACY Places API is unavailable (it throws
// LegacyApiNotActivatedMapError). Verified empirically on 2026-07-13:
//   - Places autocomplete → MUST use Places (New): google.maps.places.PlaceAutocompleteElement
//     (legacy google.maps.places.Autocomplete throws). See components/PlaceInput.
//   - DirectionsService → WORKS on this project (status OK), so route/fare uses it (app/travel).
//   - Routes API (computeRoutes) is NOT enabled on the key's project — computeRoute() below is a
//     ready standby if Directions is ever disabled (enable Routes API first, then wire it in).
//   - SDK loaded with loading=async; libraries pulled on demand via importLibrary().
//
// Key comes from process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY. NEXT_PUBLIC_* is inlined at BUILD
// time — a missing/updated key requires a redeploy. See MAPS-SETUP.md.

let bootstrap: Promise<any> | null = null;
let authError: string | null = null;

/** Rejected when the key env var is missing at runtime, so the UI can show an exact message. */
export class MapsKeyMissingError extends Error {
  constructor() { super('NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set'); this.name = 'MapsKeyMissingError'; }
}

/** Human error string if Google rejected the key (invalid/referrer/billing/API-not-enabled), else null. */
export function getMapsAuthError(): string | null { return authError; }

export function mapsKey(): string | undefined { return process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY; }

/** Loads the Maps JS bootstrap once (loading=async). Libraries are pulled on demand via importLibrary. */
export function loadMaps(): Promise<any> {
  if (typeof window === 'undefined') return new Promise(() => {});

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) {
    console.error('[maps] NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set — the Maps SDK cannot load. ' +
      'Set it in Vercel (Settings → Environment Variables) and redeploy; NEXT_PUBLIC_* is inlined at build time.');
    return Promise.reject(new MapsKeyMissingError());
  }

  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (bootstrap) return bootstrap;

  // Google invokes this global on auth failures. It doesn't pass the reason, but logs the exact
  // *MapError code to the console right before — surface both.
  (window as any).gm_authFailure = () => {
    authError = 'Google Maps rejected the request — check the API key’s HTTP-referrer restrictions, that billing is enabled, and that Maps JavaScript API + Places API (New) + Routes API are turned on.';
    console.error('[maps] gm_authFailure —', authError,
      '\n→ See the exact *MapError code Google logged just above (e.g. LegacyApiNotActivatedMapError, ApiNotActivatedMapError, RefererNotAllowedMapError, InvalidKeyMapError). Fix per MAPS-SETUP.md.');
  };

  bootstrap = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    (window as any).__mapsReady = () => resolve((window as any).google);
    // loading=async (per Google's console warning) + no &libraries — pull libraries via importLibrary.
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly&loading=async&callback=__mapsReady`;
    s.async = true;
    s.onerror = () => {
      authError = 'Google Maps script failed to load (network error or blocked request).';
      console.error('[maps]', authError);
      reject(new Error(authError));
    };
    document.head.appendChild(s);
  });
  return bootstrap;
}

/** Import a specific Maps library via the new loader (e.g. 'places', 'maps', 'geometry'). */
export async function importMapsLibrary<T = any>(name: string): Promise<T> {
  const g = await loadMaps();
  return g.maps.importLibrary(name) as Promise<T>;
}

export type RouteResult = { km: number; min: number; polyline: string };

/**
 * STANDBY (not currently wired): computes a driving route via the Routes API (computeRoutes).
 * DirectionsService works on this project today, so the travel flow uses that. If Google ever
 * disables the legacy Directions API, enable the Routes API on the key's GCP project and switch
 * app/travel to call this instead — it returns the SAME km/min the fare logic expects (plus an
 * encoded polyline). Verified CORS-OK from the browser; a referrer-restricted key works here.
 */
export async function computeRoute(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
): Promise<RouteResult> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) throw new MapsKeyMissingError();

  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? `Routes API error (HTTP ${res.status})`);
  const r = json.routes?.[0];
  if (!r) throw new Error('No route found between those locations.');

  const km = Number(r.distanceMeters ?? 0) / 1000;
  const min = Math.round(Number(String(r.duration ?? '0s').replace('s', '')) / 60);
  return { km, min, polyline: r.polyline?.encodedPolyline ?? '' };
}
