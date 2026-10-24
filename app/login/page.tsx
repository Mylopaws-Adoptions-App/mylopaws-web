'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PillButton, Photo, Logo } from '@/components/design';
import PhoneAuthSheet from '@/components/PhoneAuthSheet';
import { PawIcon } from '@/components/design/nav-icons';

// Sign-in for the Mylopaws Shop app. Shopping and Ask Mylo work without an account;
// signing in (phone + OTP) is needed to pay and to see orders.
export default function Login() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace('/'); });
  }, [router]);

  const perks = [
    { e: '🐾', t: 'Ask Mylo', s: 'Our AI shopping assistant finds the right product and size for your pet.' },
    { e: '💸', t: 'Below-MRP prices', s: 'Genuine products from a licensed pet pharmacy in Bangalore.' },
    { e: '🚚', t: 'Evening delivery or free pickup', s: 'Free delivery on bigger orders, or collect from HSR Layout.' },
    { e: '🔁', t: 'One-tap refills', s: 'Reorder tick & flea care and supplements when they’re due.' },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-white px-5 pb-8 pt-[calc(1.75rem+env(safe-area-inset-top))]">
      <Logo boxClassName="h-10 w-32" priority />
      <h1 className="mt-6 text-[32px] font-extrabold leading-[1.1] tracking-[-0.5px] text-ink">Pet care, <span className="text-plum">sorted.</span></h1>
      <p className="mt-2 text-[15px] leading-[1.55] text-body">Medicines, tick & flea care, skin & coat care, supplements and food for dogs and cats, delivered across Bangalore.</p>
      <div className="mt-6 space-y-2">
        <PillButton onClick={() => setAuthOpen(true)}>Sign in with phone</PillButton>
        <Link href="/" className="flex min-h-[54px] items-center justify-center gap-2 rounded-btn border-[1.5px] border-plum text-[16px] font-bold text-plum">
          <PawIcon className="h-5 w-5" /> Start shopping
        </Link>
      </div>
      <Photo srcKey="loginHero" alt="A happy pet family" className="mt-7 h-44 w-full" sizes="480px" priority />
      <ul className="mt-6 space-y-3">
        {perks.map((p) => (
          <li key={p.t} className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-plum-soft text-[18px]" aria-hidden>{p.e}</span>
            <span><span className="block text-[15px] font-bold text-ink">{p.t}</span><span className="block text-[13px] leading-[1.5] text-muted">{p.s}</span></span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-8 text-center text-[12px] text-muted">
        <Link href="/terms" className="underline underline-offset-4">Terms</Link> · <Link href="/privacy" className="underline underline-offset-4">Privacy</Link> · <Link href="/cancellation" className="underline underline-offset-4">Cancellations</Link>
        <Link href="/ops/login" className="mt-3 block text-[12px] text-muted">Mylopaws team? Staff sign-in</Link>
      </div>
      <PhoneAuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
