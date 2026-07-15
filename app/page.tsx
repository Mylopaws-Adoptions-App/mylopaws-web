'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AuthGate, { useSession } from '@/components/AuthGate';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { Icons, PhotoBg, Photo } from '@/components/design';

const AGAIN: Record<string, { href: string; label: string }> = {
  travel: { href: '/travel', label: 'Book another ride 🚗' },
  dermacare: { href: '/dermacare', label: 'Book Dermacare again ✨' },
  homes: { href: '/homes', label: 'Book boarding again 🐱' },
};

function Home() {
  const { session } = useSession();
  const [name, setName] = useState('');
  // Repeat-customer warmth: surface a one-tap "book again" for the vertical they last used.
  const [lastKind, setLastKind] = useState<string | null>(null);

  useEffect(() => {
    const uid = session!.user.id;
    supabase.from('customers').select('name').eq('id', uid).single()
      .then(({ data }) => setName((data?.name ?? '').split(' ')[0]));

    Promise.all([
      supabase.from('orders').select('created_at').eq('customer_id', uid).order('created_at', { ascending: false }).limit(1),
      supabase.from('dermacare_orders').select('created_at').eq('customer_id', uid).order('created_at', { ascending: false }).limit(1),
      supabase.from('homes_orders').select('created_at').eq('customer_id', uid).order('created_at', { ascending: false }).limit(1),
    ]).then(([t, d, h]) => {
      const cands = [
        { kind: 'travel', at: t.data?.[0]?.created_at },
        { kind: 'dermacare', at: d.data?.[0]?.created_at },
        { kind: 'homes', at: h.data?.[0]?.created_at },
      ].filter(c => c.at) as { kind: string; at: string }[];
      if (cands.length) setLastKind(cands.sort((a, b) => b.at.localeCompare(a.at))[0].kind);
    });
  }, [session]);

  const again = lastKind ? AGAIN[lastKind] : null;

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-white px-5 pb-28 pt-[calc(2rem+env(safe-area-inset-top))]">
      <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-ink">{again ? 'Welcome back' : 'Hi'} {name || 'there'} 👋</h1>
      <p className="mt-1 text-[15px] text-body">What does your furbaby need today?</p>

      {again && (
        <Link href={again.href}
          className="mt-4 flex items-center justify-between rounded-card bg-plum-soft px-4 py-3 text-[14px] font-bold text-plum active:scale-[0.99]">
          <span>{again.label}</span>
          <Icons.ChevronRight className="h-4 w-4" />
        </Link>
      )}

      <div className="mt-7 space-y-4">
        <Link href="/travel" className="relative block overflow-hidden rounded-card bg-plum p-6 text-white shadow-card">
          <PhotoBg srcKey="travelCard" alt="A dog out on a walk" priority
            overlay="from-plum via-plum/85 to-plum/45" />
          <div className="relative z-10">
            <div className="text-4xl">🚗</div>
            <h2 className="mt-3 text-[22px] font-bold">Pet Travel</h2>
            <p className="mt-1 text-[14px] leading-[1.5] text-white/90">Pet-friendly cabs, intracity &amp; outstation. Live-tracked — like Uber, but for paws.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-[15px] font-bold text-butter">Book a ride <Icons.ChevronRight className="h-4 w-4" /></span>
          </div>
        </Link>

        <Link href="/dermacare" className="relative block overflow-hidden rounded-card bg-plum-dark p-6 text-white shadow-card">
          <PhotoBg srcKey="dermacareCard" alt="A vet caring for a dog"
            overlay="from-black/80 via-black/45 to-black/10" />
          <div className="relative z-10">
            <div className="text-4xl">✨</div>
            <h2 className="mt-3 text-[22px] font-bold">Dermacare</h2>
            <p className="mt-1 text-[14px] leading-[1.5] text-white/90">12 medicated skin &amp; coat therapies by specialists. 4.9★ from 97 pawparents.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-[15px] font-bold text-mint">See therapies <Icons.ChevronRight className="h-4 w-4" /></span>
          </div>
        </Link>

        <Link href="/homes" className="flex items-center gap-4 rounded-card border border-line bg-white p-5 shadow-card">
          <Photo srcKey="homesCard" alt="A cat and dog resting together" rounded="rounded-xl"
            className="h-16 w-16 shrink-0" sizes="64px" />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold text-ink">Mylopaws Homes
              <span className="ml-2 rounded-full bg-butter px-2 py-0.5 text-[10px] font-bold text-plum">NOW BOOKING</span>
            </p>
            <p className="text-[13px] text-muted">Cat boarding by Joanna — vetted, cats-only home stays.</p>
          </div>
          <Icons.ChevronRight className="h-5 w-5 shrink-0 text-plum" />
        </Link>
      </div>

      <a href="https://wa.me/919887445671" target="_blank" rel="noreferrer"
        className="mt-6 flex min-h-[48px] items-center justify-center gap-2 text-[15px] font-semibold text-body">
        💬 Chat with us on WhatsApp
      </a>

      <Nav />
    </div>
  );
}

export default function Page() { return <AuthGate><Home /></AuthGate>; }
