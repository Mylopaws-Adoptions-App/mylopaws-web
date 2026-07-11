# Mylopaws Web — www.mylopaws.app
Next.js 14 + Tailwind + Supabase + Razorpay. Customer booking experience at `/`, staff platform at `/ops`.
Uses the SAME live Supabase backend as the mobile apps (project `sbajixyhyyjpgkxrhltc`) — no backend changes needed.

## Local dev
```bash
cp .env.example .env.local
npm install
npm run dev
```

## Deploy (Vercel)
Import this repo in Vercel → set the 3 env vars from `.env.example` → add domain `www.mylopaws.app`.
Full step-by-step: see DEPLOY.md.
