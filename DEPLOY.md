# Deploying to www.mylopaws.app (Vercel) — step by step

## 1. Vercel import (~3 min)
1. vercel.com → **Add New → Project** → Import the `mylopaws-web` GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Build command / output: defaults.
3. Environment Variables (all three, for Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://sbajixyhyyjpgkxrhltc.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_3HscNwOMimpC7a35QPM2tA_Qni9VdWq`
   - `NEXT_PUBLIC_GOOGLE_MAPS_KEY` = your Maps key
4. **Deploy**. You'll get `mylopaws-web-xxx.vercel.app` — smoke-test there first.

## 2. Domain (~5 min + DNS propagation)
1. Vercel project → **Settings → Domains** → add `www.mylopaws.app` and `mylopaws.app`.
2. At your registrar (wherever mylopaws.app is registered):
   - `www` → CNAME → `cname.vercel-dns.com`
   - apex `@` → A → `76.76.21.21`
3. Vercel auto-issues SSL. Set `www.mylopaws.app` as primary (apex redirects to it).

## 3. Supabase auth URLs (2 min — login breaks without this)
Supabase Dashboard → **Authentication → URL Configuration**:
- Site URL: `https://www.mylopaws.app`
- Additional Redirect URLs:
  - `https://www.mylopaws.app`
  - `https://mylopaws.app`
  - `https://*.vercel.app` (previews; can remove later)

## 4. Google OAuth origins (2 min)
Google Cloud Console → your OAuth client (the one wired into Supabase):
- Authorized JavaScript origins: `https://www.mylopaws.app`, `https://mylopaws.app`
- Authorized redirect URI (already there for mobile setup): `https://sbajixyhyyjpgkxrhltc.supabase.co/auth/v1/callback`

## 5. Maps key referrers (2 min)
Google Cloud Console → Credentials → Maps key → Application restrictions → **Websites**:
`https://www.mylopaws.app/*`, `https://mylopaws.app/*`, `https://*.vercel.app/*` (drop the last one after launch).
APIs needed: Maps JavaScript API, Places API, Directions API.

## 6. Smoke test on production
Google login → book a travel ride (small real payment — you can refund in Razorpay) →
open `/ops` in another browser → assign → open trip screen on a phone → status advance →
watch live dot on the customer tracking page → payment flips to PAID (webhook).

## Web-specific limits (by design, v1)
- Supplier GPS streams only while the /ops trip tab is open (browsers have no background location). The Ops mobile app is the long-term driver tool.
- No web push notifications; the UI updates live via Supabase Realtime instead. The `send-push` calls still notify mobile-app users.
