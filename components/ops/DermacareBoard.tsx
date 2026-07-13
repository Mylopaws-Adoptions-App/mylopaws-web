'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStaff } from '@/components/OpsContext';
import { supabase } from '@/lib/supabase';
import { STATUS_META, aggressionMeta, fmtApptDateTime, navUrl, rupees } from '@/lib/types';
import { Segmented, SelectChip, LoadingState, EmptyState, ErrorState } from '@/components/design';

const PAST = ['delivered', 'cancelled'];
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

type Row = any;

function JobCard({ o, amount, agg }: { o: Row; amount: number; agg: number }) {
  const a = aggressionMeta(agg);
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      <Link href={`/ops/trip/dermacare/${o.id}`} className="block p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[13px] font-semibold text-muted">{fmtApptDateTime(o.date_of_appointment, o.time_of_appointment)}</span>
          <span className="shrink-0 text-[16px] font-bold text-ink">{rupees(amount)}</span>
        </div>
        <p className="mt-2 text-[16px] font-bold text-ink">{o.pawparent_name}</p>
        <p className="mt-1 text-[14px] leading-[1.5] text-body line-clamp-3">{o.address_text}</p>
        {agg >= 2 && <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] ${a.chip}`}>⚠ {a.label}</span>}
      </Link>
      <div className="grid grid-cols-2 border-t border-line">
        <a href={`tel:${o.phone_number}`} className="flex min-h-[48px] items-center justify-center gap-2 border-r border-line text-[14px] font-bold text-plum">📞 Call</a>
        <a href={navUrl(o.lat, o.lng, o.address_text)} target="_blank" rel="noreferrer" className="flex min-h-[48px] items-center justify-center gap-2 bg-plum text-[14px] font-bold text-white">▲ Navigate</a>
      </div>
    </div>
  );
}

export default function DermacareBoard() {
  const { me } = useStaff();
  const isAdmin = me?.role === 'admin';

  const [orders, setOrders] = useState<Row[] | null>(null);
  const [pets, setPets] = useState<Record<string, number>>({});   // pet_id → aggression_level
  const [amounts, setAmounts] = useState<Record<number, number>>({}); // order_id → total
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [statusFilter, setStatusFilter] = useState('all'); // admin only

  const load = useCallback(async () => {
    setError(false);
    const { data, error } = await supabase.from('dermacare_orders').select('*')
      .order('date_of_appointment', { ascending: true }).order('time_of_appointment', { ascending: true }).limit(300);
    if (error) { setError(true); return; }
    const rows = (data as Row[]) ?? [];
    setOrders(rows);

    const petIds = Array.from(new Set(rows.map(r => r.pet_id).filter(Boolean)));
    if (petIds.length) {
      const { data: p } = await supabase.from('pets').select('id, aggression_level').in('id', petIds);
      setPets(Object.fromEntries((p ?? []).map((x: any) => [x.id, x.aggression_level ?? 0])));
    }
    const ids = rows.map(r => r.id);
    if (ids.length) {
      const { data: items } = await supabase.from('dermacare_order_items').select('order_id, price_at_booking, service_id').in('order_id', ids);
      const petsCount = Object.fromEntries(rows.map(r => [r.id, r.pets_count ?? 1]));
      const map: Record<number, number> = {};
      for (const it of (items ?? []) as any[]) {
        map[it.order_id] = (map[it.order_id] ?? 0) + Number(it.price_at_booking) * (it.service_id ? Number(petsCount[it.order_id] ?? 1) : 1);
      }
      // Fall back to stored total_amount if an order somehow has no items.
      for (const r of rows) if (map[r.id] == null && r.total_amount != null) map[r.id] = Number(r.total_amount);
      setAmounts(map);
    }
  }, []);

  useEffect(() => { if (me) load(); }, [me, load]);
  useEffect(() => {
    const ch = supabase.channel('board-dermacare-groomer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dermacare_orders' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const { todays, upcoming, past } = useMemo(() => {
    const all = orders ?? [];
    const active = all.filter(o => !PAST.includes(o.status));
    const t = todayISO();
    let todays = active.filter(o => o.date_of_appointment === t);
    let upcoming = active.filter(o => o.date_of_appointment !== t);
    let past = all.filter(o => PAST.includes(o.status)).sort((a, b) => (b.date_of_appointment ?? '').localeCompare(a.date_of_appointment ?? ''));
    if (isAdmin && statusFilter !== 'all') {
      todays = todays.filter(o => o.status === statusFilter);
      upcoming = upcoming.filter(o => o.status === statusFilter);
      past = past.filter(o => o.status === statusFilter);
    }
    return { todays, upcoming, past };
  }, [orders, isAdmin, statusFilter]);

  const card = (o: Row) => <JobCard key={o.id} o={o} amount={amounts[o.id] ?? Number(o.total_amount ?? 0)} agg={pets[o.pet_id] ?? 0} />;

  return (
    <main className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="mb-4 text-[22px] font-extrabold tracking-[-0.5px] text-ink">✨ Dermacare Jobs</h1>

      <Segmented value={tab} onChange={v => setTab(v as any)}
        options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]} />

      {isAdmin && (
        <div className="mt-3 flex flex-wrap gap-2">
          {['all', 'unassigned', 'assigned', 'on_the_way', 'in_progress', 'delivered', 'cancelled'].map(s => (
            <SelectChip key={s} label={s === 'all' ? 'All' : (STATUS_META[s]?.label ?? s)} selected={statusFilter === s} onClick={() => setStatusFilter(s)} />
          ))}
        </div>
      )}

      {error ? (
        <ErrorState onRetry={load} />
      ) : !orders ? (
        <LoadingState label="Loading jobs…" />
      ) : tab === 'upcoming' ? (
        todays.length === 0 && upcoming.length === 0 ? (
          <EmptyState emoji="✨" title="No upcoming jobs" sub="New Dermacare bookings will appear here." />
        ) : (
          <div className="mt-5 space-y-6">
            {todays.length > 0 && (
              <section>
                <h2 className="mb-3 text-[18px] font-bold text-ink">Today&apos;s Bookings</h2>
                <div className="space-y-3">{todays.map(card)}</div>
              </section>
            )}
            {upcoming.length > 0 && (
              <section>
                <h2 className="mb-3 text-[18px] font-bold text-ink">Upcoming</h2>
                <div className="space-y-3">{upcoming.map(card)}</div>
              </section>
            )}
          </div>
        )
      ) : (
        past.length === 0 ? (
          <EmptyState emoji="📋" title="No past jobs yet" sub="Completed and cancelled jobs show here." />
        ) : (
          <div className="mt-5 space-y-3">{past.map(card)}</div>
        )
      )}
    </main>
  );
}
