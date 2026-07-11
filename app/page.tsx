'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AuthGate, { useSession } from '@/components/AuthGate';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui';

function Home() {
  const { session } = useSession();
  const [name, setName] = useState('');
  const [waitlisted, setWaitlisted] = useState(false);

  useEffect(() => {
    supabase.from('customers').select('name').eq('id', session!.user.id).single()
      .then(({ data }) => setName((data?.name ?? '').split(' ')[0]));
  }, [session]);

  const joinWaitlist = async () => {
    const { data: c } = await supabase.from('customers').select('name, phone_number, email').eq('id', session!.user.id).single();
    const { error } = await supabase.from('waitlist_signups').insert({
      customer_id: session!.user.id, name: c?.name, phone_number: c?.phone_number, email: c?.email, service: 'homes',
    });
    if (!error) setWaitlisted(true);
  };

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

        <Card className="mt-4 border-2 border-dashed !border-brass">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🏡</div>
            <div className="flex-1">
              <p className="font-bold">Mylopaws Homes <span className="ml-1 rounded-full bg-brass/30 px-2 py-0.5 text-[10px] font-black text-magenta">COMING SOON</span></p>
              <p className="text-sm text-ink-soft">Loving pet boarding, vetted homes.</p>
            </div>
            <button onClick={joinWaitlist} disabled={waitlisted}
              className={`min-h-[44px] rounded-full px-4 text-sm font-black ${waitlisted ? 'bg-line text-ink-soft' : 'bg-brass text-ink hover:opacity-90'}`}>
              {waitlisted ? 'On the list ✓' : 'Join waitlist'}
            </button>
          </div>
        </Card>

        <a href="https://wa.me/919887445671" target="_blank" rel="noreferrer"
          className="mt-6 flex items-center justify-center gap-2 py-3 font-bold text-ink hover:text-magenta">
          💬 Chat with us on WhatsApp
        </a>
      </main>
    </>
  );
}

export default function Page() { return <AuthGate><Home /></AuthGate>; }
