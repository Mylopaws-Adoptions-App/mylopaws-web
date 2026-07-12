'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AuthGate, { useSession } from '@/components/AuthGate';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';

function Home() {
  const { session } = useSession();
  const [name, setName] = useState('');

  useEffect(() => {
    supabase.from('customers').select('name').eq('id', session!.user.id).single()
      .then(({ data }) => setName((data?.name ?? '').split(' ')[0]));
  }, [session]);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="font-display text-4xl font-black">Hi {name || 'there'} 👋</h1>
        <p className="mt-1 text-ink-soft">What does your furbaby need today?</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link href="/travel" className="group relative overflow-hidden rounded-3xl bg-magenta p-6 text-white transition-transform hover:-translate-y-0.5">
            <div className="text-4xl">🚗</div>
            <h2 className="mt-3 font-display text-2xl font-black">Pet Travel</h2>
            <p className="mt-1 text-sm text-white/85">Pet-friendly cabs, intracity & outstation. Live-tracked — like Uber, but for paws.</p>
            <span className="mt-4 inline-block font-black text-brass transition-transform group-hover:translate-x-1">Book a ride →</span>
          </Link>
          <Link href="/dermacare" className="group relative overflow-hidden rounded-3xl bg-night p-6 text-white transition-transform hover:-translate-y-0.5">
            <div className="text-4xl">✨</div>
            <h2 className="mt-3 font-display text-2xl font-black">Dermacare</h2>
            <p className="mt-1 text-sm text-white/85">12 medicated skin & coat therapies by specialists. 4.9★ from 97 pawparents.</p>
            <span className="mt-4 inline-block font-black text-brass transition-transform group-hover:translate-x-1">See therapies →</span>
          </Link>
        </div>

        <Link href="/homes" className="group mt-4 flex items-center gap-4 rounded-3xl border-2 border-brass bg-[#FFF9EC] p-5 transition-transform hover:-translate-y-0.5">
          <div className="text-4xl">🏡</div>
          <div className="flex-1">
            <p className="font-display text-lg font-black">Mylopaws Homes <span className="ml-1 rounded-full bg-brass/40 px-2 py-0.5 text-[10px] font-black text-magenta">NOW BOOKING</span></p>
            <p className="text-sm text-ink-soft">Cat boarding by Joanna — vetted, cats-only home stays.</p>
          </div>
          <span className="font-black text-magenta transition-transform group-hover:translate-x-1">→</span>
        </Link>

        <a href="https://wa.me/919887445671" target="_blank" rel="noreferrer"
          className="mt-6 flex items-center justify-center gap-2 py-3 font-bold text-ink hover:text-magenta">
          💬 Chat with us on WhatsApp
        </a>
      </main>
    </>
  );
}

export default function Page() { return <AuthGate><Home /></AuthGate>; }
