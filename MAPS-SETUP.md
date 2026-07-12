# Google Maps setup (Travel booking flow)

The Travel flow (`/travel`) renders a live route map and computes distance/ETA via the
Google Maps **JavaScript SDK** (`lib/maps.ts`). The mobile app's REST endpoints are
CORS-blocked in browsers, so the web app must use the JS SDK — do not switch to REST.

The map reads its key from **`process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY`**, consumed at
**`lib/maps.ts` line 12** (the `<script src=…&key=${…}>` that loads the SDK).

If the map shows an error box instead of a map, work through the three things below.

---

## 1. Set the Vercel environment variable (and redeploy)

`NEXT_PUBLIC_*` variables are **inlined at build time**, not read at runtime. Setting the
var without redeploying does nothing — the old build still has the old (or empty) value.

1. Vercel → your project → **Settings → Environment Variables**
2. Add `NEXT_PUBLIC_GOOGLE_MAPS_KEY` = *your key*, for **Production** (and Preview/Development as needed)
3. **Redeploy** (a fresh build is required for the value to reach the browser)

To confirm the key is actually reaching the browser: open the deployed site, DevTools →
Network, and check the `maps.googleapis.com/maps/api/js?...` request — the `key=` query
param should be your key, not `undefined`. If it's `undefined`, the env var didn't make it
into the build (step above). The app also logs a clear console error and shows
"Map unavailable — NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set." in the map area.

## 2. Enable the three Google Cloud APIs

Google Cloud Console → **APIs & Services → Enabled APIs & Services → + Enable APIs**:

- **Maps JavaScript API**
- **Places API**
- **Directions API**

A missing API surfaces in the console as `ApiNotActivatedMapError`. Billing must also be
enabled on the project, or you'll see `BillingNotEnabledMapError`.

## 3. Restrict the key by HTTP referrer

Google Cloud Console → **APIs & Services → Credentials →** your key → **Application
restrictions → HTTP referrers (web sites)**, and allow:

```
https://www.mylopaws.app/*
https://mylopaws.app/*
https://*.vercel.app/*
```

(Add `http://localhost:3000/*` for local dev if you restrict the same key.) A referrer
mismatch surfaces as `RefererNotAllowedMapError`.

---

## How failures surface in the app

`lib/maps.ts` no longer fails silently:

- **Missing key** → `loadMaps()` rejects with `MapsKeyMissingError`; the map area shows
  "Map unavailable — NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set." and logs a console error.
- **Auth / referrer / billing / API-not-enabled** → Google calls `window.gm_authFailure`;
  we log a `[maps] gm_authFailure` console error pointing at the exact reason code that
  Google prints (e.g. `RefererNotAllowedMapError`, `ApiNotActivatedMapError`,
  `BillingNotEnabledMapError`, `InvalidKeyMapError`), and the map area shows an actionable
  message instead of a blank grey box.
- **Directions failure** → the specific status (e.g. `REQUEST_DENIED`) is shown inline.

So when something breaks, open the browser console: the exact Google reason code tells you
which of the three sections above to fix.
