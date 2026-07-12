'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AuthGate, { useSession } from '@/components/AuthGate';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { Icons } from '@/components/design';

function Home() {
  const { session } = useSession();
  const [name, setName] = useState('');

  useEffect(() => {
    supabase.from('customers').select('name').eq('id', session!.user.id).single()
      .then(({ data }) => setName((data?.name ?? '').split(' ')[0]));
  }, [session]);

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-white px-5 pb-28 pt-8">
      <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-ink">Hi {name || 'there'} 👋</h1>
      <p className="mt-1 text-[15px] text-body">What does your furbaby need today?</p>

      <div className="mt-7 space-y-4">
        <Link href="/travel" className="block rounded-card bg-plum p-6 text-white shadow-card">
          <div className="text-4xl">🚗</div>
          <h2 className="mt-3 text-[22px] font-bold">Pet Travel</h2>
          <p className="mt-1 text-[14px] leading-[1.5] text-white/85">Pet-friendly cabs, intracity &amp; outstation. Live-tracked — like Uber, but for paws.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-[15px] font-bold text-butter">Book a ride <Icons.ChevronRight className="h-4 w-4" /></span>
        </Link>

        <Link href="/dermacare" className="block rounded-card bg-mint p-6 text-ink shadow-card">
          <div className="text-4xl">✨</div>
          <h2 className="mt-3 text-[22px] font-bold">Dermacare</h2>
          <p className="mt-1 text-[14px] leading-[1.5] text-body">12 medicated skin &amp; coat therapies by specialists. 4.9★ from 97 pawparents.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-[15px] font-bold text-plum">See therapies <Icons.ChevronRight className="h-4 w-4" /></span>
        </Link>

        <Link href="/homes" className="flex items-center gap-4 rounded-card border border-line bg-white p-5 shadow-card">
          <div className="text-4xl">🏡</div>
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
