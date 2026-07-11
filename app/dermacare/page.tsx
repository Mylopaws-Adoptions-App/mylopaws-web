'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { Therapy } from '@/lib/types';
import { Spinner, Btn } from '@/components/ui';

function Catalog() {
  const [rows, setRows] = useState<Therapy[] | null>(null);
  useEffect(() => {
    supabase.from('therapies').select('*').eq('active', true).order('sort_order').then(({ data }) => setRows((data as Therapy[]) ?? []));
  }, []);
  if (!rows) return <Spinner label="Loading therapies…" />;
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="font-display text-3xl font-black">Dermacare Therapies ✨</h1>
      <p className="mt-1 text-sm text-ink-soft">Specialised skin & coat therapy — not standard grooming. 4.9★ · 97 reviews · HSR Layout & at-home.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {rows.map(t => (
          <Link key={t.id} href={`/dermacare/${t.id}`} className="group rounded-2xl border border-line bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-start justify-between">
              <div className="text-3xl">🛁</div>
              <div className="text-right">
                <div className="font-display text-xl font-black text-magenta">₹{t.price}</div>
                <div className="text-xs text-ink-soft">~{t.duration_min} min</div>
              </div>
            </div>
            <h2 className="mt-3 font-bold leading-snug">{t.branded_name}</h2>
            <p className="mt-1 line-clamp-2 text-xs text-ink-soft">For: {t.target_symptoms}</p>
            <span className="mt-3 inline-block text-sm font-black text-magenta group-hover:translate-x-1 transition-transform">Details →</span>
          </Link>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Btn onClick={() => location.assign('/dermacare/book')} className="px-8">Book therapies →</Btn>
      </div>
    </main>
  );
}
export default function Page() { return <AuthGate><><Nav /><Catalog /></></AuthGate>; }
