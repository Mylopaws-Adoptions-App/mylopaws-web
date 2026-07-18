'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import AuthGate, { useSession } from '@/components/AuthGate';
import { supabase } from '@/lib/supabase';
import { STATUS_META, placeName } from '@/lib/types';
import { PageShell, Segmented, SkeletonList, EmptyState, Icons } from '@/components/design';

type Filter = 'upcoming' | 'live' | 'past';
const LIVE = ['on_the_way', 'in_progress', 'in_stay'];
const PAST = ['delivered', 'cancelled', 'completed'];

// The honest chip for a booking, derived from the REAL payment_status + fulfilment status.
// Only paid+ orders render as confirmed bookings; unpaid ones never claim to be booked.
// Homes is request-only (no payment gate) so it keys purely off fulfilment status.
function chipFor(b: any): { label: string; tone: string; retry?: boolean } {
  if (b.status === 'cancelled') return { label: 'Cancelled', tone: 'bg-surface-alt text-muted' };
  if (b.kind !== 'homes') {
    if (b.payment_status === 'failed') return { label: 'Payment failed', tone: 'bg-danger/10 text-danger', retry: true };
    if (b.payment_status !== 'paid') return { label: 'Payment incomplete', tone: 'bg-butter text-ink', retry: true };
  }
  switch (b.status) {
    case 'unassigned': return { label: 'Confirmed', tone: 'bg-plum-soft text-plum' };
    case 'assigned': return { label: 'Assigned', tone: 'bg-plum-soft text-plum' };
    case 'on_the_way': return { label: 'On the way', tone: 'bg-mint/50 text-ink' };
    case 'in_progress':
    case 'in_stay': return { label: 'In progress', tone: 'bg-mint/50 text-ink' };
    case 'delivered':
    case 'completed': return { label: 'Completed', tone: 'bg-surface-alt text-muted' };
    default: return { label: STATUS_META[b.status]?.label ?? b.status, tone: 'bg-plum-soft text-plum' };
  }
}

function Bookings() {
  const { session } = useSession();
  const router = useRouter();
  const [all, setAll] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<Filter>('upcoming');

  const load = useCallback(async () => {
    const [t, d, h] = await Promise.all([
      supabase.from('orders').select('*').eq('customer_id', session!.user.id).order('created_at', { ascending: false }),
      supabase.from('dermacare_orders').select('*').eq('customer_id', session!.user.id).order('created_at', { ascending: false }),
      supabase.from('homes_orders').select('*').eq('customer_id', session!.user.id).order('created_at', { ascending: false }),
    ]);
    setAll([
      ...(t.data ?? []).map(o => ({ kind: 'travel', ...o })),
      ...(d.data ?? []).map(o => ({ kind: 'dermacare', ...o })),
      ...(h.data ?? []).map(o => ({ kind: 'homes', ...o })),
    ].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }, [session]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const ch = supabase.channel('my-orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${session!.user.id}` }, load)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dermacare_orders', filter: `customer_id=eq.${session!.user.id}` }, load)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'homes_orders', filter: `customer_id=eq.${session!.user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, session]);

  const filtered = (all ?? []).filter(b =>
    filter === 'live' ? LIVE.includes(b.status) : filter === 'past' ? PAST.includes(b.status) : !PAST.includes(b.status) && !LIVE.includes(b.status));

  return (
    <PageShell variant="plum" size="large" title="My Bookings" sheetClassName="pb-28">
      <Segmented value={filter} onChange={v => setFilter(v as Filter)}
        options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'live', label: 'Live' }, { value: 'past', label: 'Past' }]} />

      {!all ? (
        <SkeletonList count={4} lines={2} />
      ) : filtered.length === 0 ? (
        <EmptyState photo="emptyWarm" title={filter === 'live' ? 'Nothing live right now' : 'No bookings here yet'}
          sub="Book pet travel, Dermacare, or cat boarding from Home."
          action={{ label: 'Explore services', onClick: () => router.push('/') }} />
      ) : (
        <div className="mp-fade mt-4 space-y-3">
          {filtered.map(b => { const c = chipFor(b); return (
            <Link key={`${b.kind}-${b.id}`} href={b.kind === 'homes' ? `/homes/booking/${b.id}` : `/track/${b.kind}/${b.id}`}
              className="block rounded-card border border-line bg-white p-4 shadow-card transition active:scale-[0.98]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[15px] font-bold text-ink">{b.kind === 'travel' ? '🚗 Travel' : b.kind === 'dermacare' ? '✨ Dermacare' : '🐱 Boarding'} · #{b.id}</span>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${c.tone}`}>{c.label}</span>
              </div>
              <p className="mt-1 truncate text-[13px] text-muted">
                {b.kind === 'travel' ? `${placeName(b.pickup_name, b.pickup_address)} → ${placeName(b.drop_name, b.drop_address)}`
                  : b.kind === 'dermacare' ? (b.therapy_names ?? 'Therapy session') : b.provider}
              </p>
              <p className="mt-1 text-[13px] font-semibold text-body">
                {b.kind === 'travel' ? `${b.date_of_travel} · ${b.time_of_travel}`
                  : b.kind === 'dermacare' ? `${b.date_of_appointment} · ${b.time_of_appointment}`
                  : `${b.check_in} → ${b.check_out} · ${b.nights} night${b.nights === 1 ? '' : 's'}`} · {b.furbaby_name}
              </p>
              {c.retry && (
                <p className="mt-1 inline-flex items-center gap-1 text-[13px] font-bold text-plum">Tap to retry payment <Icons.ChevronRight className="h-3.5 w-3.5" /></p>
              )}
              {b.kind !== 'homes' && LIVE.includes(b.status) && (
                <p className="mt-1 inline-flex items-center gap-1 text-[13px] font-bold text-plum">Track live <Icons.ChevronRight className="h-3.5 w-3.5" /></p>
              )}
            </Link>
          ); })}
        </div>
      )}
    </PageShell>
  );
}

export default function Page() { return <AuthGate><Bookings /></AuthGate>; }
