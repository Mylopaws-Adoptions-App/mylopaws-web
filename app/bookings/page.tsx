'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AuthGate, { useSession } from '@/components/AuthGate';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { Badge, Chip, Empty, Spinner } from '@/components/ui';

type Filter = 'upcoming' | 'live' | 'past';
const LIVE = ['on_the_way', 'in_progress'];
const PAST = ['delivered', 'cancelled'];

function Bookings() {
  const { session } = useSession();
  const [all, setAll] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<Filter>('upcoming');

  const load = useCallback(async () => {
    const [t, d] = await Promise.all([
      supabase.from('orders').select('*').eq('customer_id', session!.user.id).order('created_at', { ascending: false }),
      supabase.from('dermacare_orders').select('*').eq('customer_id', session!.user.id).order('created_at', { ascending: false }),
    ]);
    setAll([
      ...(t.data ?? []).map(o => ({ kind: 'travel', ...o })),
      ...(d.data ?? []).map(o => ({ kind: 'dermacare', ...o })),
    ].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }, [session]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const ch = supabase.channel('my-orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${session!.user.id}` }, load)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dermacare_orders', filter: `customer_id=eq.${session!.user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, session]);

  if (!all) return <Spinner label="Fetching your bookings…" />;
  const filtered = all.filter(b =>
    filter === 'live' ? LIVE.includes(b.status) : filter === 'past' ? PAST.includes(b.status) : !PAST.includes(b.status) && !LIVE.includes(b.status));

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="font-display text-3xl font-black">My Bookings</h1>
      <div className="mt-4 flex flex-wrap">
        {(['upcoming', 'live', 'past'] as Filter[]).map(f =>
          <Chip key={f} label={f[0].toUpperCase() + f.slice(1)} selected={filter === f} onClick={() => setFilter(f)} />)}
      </div>
      {filtered.length === 0
        ? <Empty title={filter === 'live' ? 'Nothing live right now' : 'No bookings here yet'} sub="Book a travel ride or a Dermacare therapy from Home." />
        : <div className="mt-4 space-y-3">
            {filtered.map(b => (
              <Link key={`${b.kind}-${b.id}`} href={`/track/${b.kind}/${b.id}`}
                className="block rounded-2xl border border-line bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{b.kind === 'travel' ? '🚗 Travel' : '✨ Dermacare'} · #{b.id}</span>
                  <Badge status={b.status} />
                </div>
                <p className="mt-1 truncate text-sm text-ink-soft">
                  {b.kind === 'travel' ? `${b.pickup_address?.split(',')[0]} → ${b.drop_address?.split(',')[0]}` : b.therapy_names ?? 'Therapy session'}
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {b.kind === 'travel' ? `${b.date_of_travel} · ${b.time_of_travel}` : `${b.date_of_appointment} · ${b.time_of_appointment}`} · {b.furbaby_name}
                </p>
                {LIVE.includes(b.status) && <p className="mt-1 text-sm font-bold text-blue-700">Track live →</p>}
              </Link>
            ))}
          </div>}
    </main>
  );
}
export default function Page() { return <AuthGate><><Nav /><Bookings /></></AuthGate>; }
