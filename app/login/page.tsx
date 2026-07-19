'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { rupees } from '@/lib/types';
import { getLandingPrices, LANDING_PRICE_FALLBACK } from '@/lib/pricing';
import { PillButton, Photo, Logo, Icons } from '@/components/design';

// Pre-login landing — the first FB/IG ad impression. Conversion goal: understand Mylopaws in
// seconds and tap ONE primary CTA to sign in / sign up. Structure (UI/UX Pro Max "Social-Proof +
// Trust"): wordmark → typographic hero + CTA above the fold → photo band → live price hooks /
// service cards → trust points → repeat CTA → policy links + staff entry. Prices are
// sourced LIVE (see lib/pricing) so the marketing numbers never drift from checkout.
export default function Login() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  // Live price hooks — seed with the current live values so the numbers paint instantly (no CLS),
  // then reconcile with the DB in case the owner changes a price later.
  const [prices, setPrices] = useState(LANDING_PRICE_FALLBACK);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace('/'); });
    getLandingPrices().then(setPrices).catch(() => {});
  }, [router]);

  const signIn = async () => {
    setBusy(true); setErr(null);
    track('login_start', { method: 'google' });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined },
    });
    if (error) { setErr(error.message); setBusy(false); }
  };

  const services = [
    { emoji: '✨', name: 'Dermacare grooming', tag: 'Medicated skin & coat therapy, at home', price: `from ${rupees(prices.fullServiceFrom)}`, cls: 'bg-plum text-white', priceCls: 'bg-butter text-plum' },
    { emoji: '🚗', name: 'Pet Cab', tag: 'Pet-friendly, live-tracked rides across Bangalore', price: `from ${rupees(prices.travelFrom)}`, cls: 'bg-mint text-ink', priceCls: 'bg-plum text-white' },
    { emoji: '🐱', name: 'Mylopaws Homes', tag: 'Vetted, cats-only home boarding', price: 'Now booking', cls: 'border border-line bg-white text-ink', priceCls: 'bg-plum-soft text-plum' },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-white px-5 pb-8 pt-[calc(1.75rem+env(safe-area-inset-top))]">
      {/* Brand — logo on the left, wordmark title beside it */}
      <div className="flex items-center gap-2.5">
        <Logo boxClassName="h-11 w-11" priority />
        <span className="text-[24px] font-extrabold tracking-[-0.5px] text-plum">Mylopaws</span>
      </div>

      {/* Hero — bold typographic lead so the CTA + price hooks stay above the fold on a 375px phone */}
      <h1 className="mt-6 text-[34px] font-extrabold leading-[1.12] tracking-[-0.6px] text-ink">
        Everything your furbaby needs — <span className="text-plum">in one app.</span>
      </h1>
      <p className="mt-3 text-[15px] leading-[1.55] text-body">
        Grooming, pet cabs &amp; home boarding across Bengaluru — for pawparents who want the best for their paw-children.
      </p>

      <div className="mt-6">
        <PillButton onClick={signIn} loading={busy}>Get started</PillButton>
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-body">
        <span className="text-[15px]">★</span> 4.9 · Loved by 2,000+ pawparents in Bengaluru
      </div>

      {/* Warm accent band — the pet photo, demoted so it supports the hero rather than pushing the CTA down */}
      <Photo srcKey="loginHero" alt="A happy pawfamily with their pet" priority
        className="mt-6 h-[148px] w-full" overlay="from-black/25 via-transparent to-transparent" />

      {/* Live price hooks as scannable service cards */}
      <section className="mt-7 space-y-3">
        {services.map((s) => (
          <div key={s.name} className={`flex items-center gap-3 rounded-card p-4 shadow-card ${s.cls}`}>
            <span className="text-[26px] leading-none" aria-hidden>{s.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-bold">{s.name}</p>
              <p className={`text-[12.5px] leading-[1.4] ${s.cls.includes('text-white') ? 'text-white/85' : 'text-muted'}`}>{s.tag}</p>
            </div>
            <span className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-extrabold ${s.priceCls}`}>{s.price}</span>
          </div>
        ))}
      </section>

      {/* Trust points — why this, before the repeat CTA */}
      <section className="mt-7 rounded-card bg-surface-alt p-5">
        <h2 className="text-[15px] font-bold text-plum">Why pawparents pick Mylopaws</h2>
        <ul className="mt-3 space-y-2">
          {[
            'Medicated Virbac grooming protocols — therapy, not just a wash',
            'Live-tracked, pet-friendly cabs — like Uber, but for paws',
            'Vetted, cats-only boarding homes you can trust',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2 text-[13.5px] leading-[1.5] text-body">
              <Icons.Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {t}
            </li>
          ))}
        </ul>
      </section>

      {/* Repeat primary CTA after the social proof */}
      <div className="mt-7">
        <PillButton onClick={signIn} loading={busy}>Get started</PillButton>

        {err && <p className="mt-3 text-center text-[13px] font-medium text-danger">{err}</p>}
        <p className="mt-4 text-center text-[12px] leading-[1.5] text-muted">
          By continuing you agree to our{' '}
          <Link href="/terms" className="font-medium text-plum underline underline-offset-2">Terms</Link> and{' '}
          <Link href="/privacy" className="font-medium text-plum underline underline-offset-2">Privacy Policy</Link>.
        </p>
      </div>

      {/* Policy links + discreet staff entry point (kept intact, visually subordinate to the CTA). */}
      <div className="mt-auto pt-6">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] font-medium text-muted">
          <Link href="/terms" className="underline decoration-line underline-offset-4">Terms &amp; Conditions</Link>
          <span aria-hidden>·</span>
          <Link href="/privacy" className="underline decoration-line underline-offset-4">Privacy Policy</Link>
          <span aria-hidden>·</span>
          <Link href="/cancellation" className="underline decoration-line underline-offset-4">Cancellation Policy</Link>
        </div>
        <Link href="/ops/login"
          className="mt-3 block text-center text-[12px] font-medium text-muted underline decoration-line underline-offset-4">
          Staff? Admin login
        </Link>
      </div>
    </main>
  );
}
