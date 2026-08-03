'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStaff } from '@/components/OpsContext';
import { supabase, invokeFn } from '@/lib/supabase';
import { STATUS_META, Staff, aggressionMeta, fmtApptDateTime, navUrl, rupees } from '@/lib/types';
import { Segmented, SelectChip, Sheet, LoadingState, EmptyState, ErrorState, Portal } from '@/components/design';
import NewBookingAlert from '@/components/ops/NewBookingAlert';

const PAST = ['delivered', 'cancelled'];
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dtOf = (o: any) => (o?.date_of_appointment && o?.time_of_appointment ? new Date(`${o.date_of_appointment}T${o.time_of_appointment}:00`).getTime() : NaN);
const TWO_H = 2 * 3600 * 1000;

type Row = any;

export default function DermacareBoard() {
  const { me } = useStaff();
  const isAdmin = me?.role === 'admin';

  const [orders, setOrders] = useState<Row[] | null>(null);
  const [pets, setPets] = useState<Record<string, number>>({});
  const [amounts, setAmounts] = useState<Record<number, number>>({});
  const [staffName, setStaffName] = useState<Record<string, string>>({});
  const [groomers, setGroomers] = useState<Staff[]>([]);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [picker, setPicker] = useState<{ ids: number[]; date: string } | null>(null);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    // Payment gate: only paid bookings reach the groomer board (see razorpay-webhook).
    const { data, error } = await supabase.from('dermacare_orders').select('*')
      .eq('payment_status', 'paid')
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
      for (const it of (items ?? []) as any[]) map[it.order_id] = (map[it.order_id] ?? 0) + Number(it.price_at_booking) * (it.service_id ? Number(petsCount[it.order_id] ?? 1) : 1);
      for (const r of rows) if (map[r.id] == null && r.total_amount != null) map[r.id] = Number(r.total_amount);
      setAmounts(map);
    }
    if (isAdmin) {
      const [{ data: all }, { data: gr }] = await Promise.all([
        supabase.from('staff').select('id, name'),
        supabase.from('staff').select('*').eq('role', 'supplier').eq('active', true).contains('verticals', ['dermacare']),
      ]);
      setStaffName(Object.fromEntries((all ?? []).map((s: any) => [s.id, s.name])));
      setGroomers((gr as Staff[]) ?? []);
    }
  }, [isAdmin]);

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
    if (isAdmin && statusFilter !== 'all') { todays = todays.filter(o => o.status === statusFilter); upcoming = upcoming.filter(o => o.status === statusFilter); past = past.filter(o => o.status === statusFilter); }
    return { todays, upcoming, past };
  }, [orders, isAdmin, statusFilter]);

  // GAP 3 — per-groomer workload for the picker's reference date + 2h-conflict against targets.
  const groomerStats = useMemo(() => {
    if (!picker || !orders) return [];
    const targets = picker.ids.map(id => orders.find(o => o.id === id)).filter(Boolean);
    return groomers.map(g => {
      const theirs = orders.filter(o => o.supplier_assigned === g.id && !PAST.includes(o.status));
      const dayCount = theirs.filter(o => o.date_of_appointment === picker.date).length;
      const conflict = targets.some(t => { const tt = dtOf(t); return !isNaN(tt) && theirs.some(o => { const ot = dtOf(o); return !isNaN(ot) && Math.abs(ot - tt) < TWO_H; }); });
      return { g, dayCount, conflict };
    }).sort((a, b) => a.dayCount - b.dayCount);
  }, [picker, orders, groomers]);

  const toggleSelect = (id: number) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const assign = async (supplierId: string) => {
    if (!picker) return;
    setAssigning(true);
    for (const oid of picker.ids) {
      const o = (orders ?? []).find(x => x.id === oid);
      const { error } = await supabase.rpc('assign_dermacare_order', { p_order_id: oid, p_new_supplier: supplierId });
      if (!error) invokeFn('send-push', { mode: 'status', order_type: 'dermacare', order_id: oid, status: o?.status === 'unassigned' ? 'assigned' : (o?.status ?? 'assigned') }).catch(() => {});
    }
    setAssigning(false); setPicker(null); setSelected(new Set()); load();
  };

  const card = (o: Row) => {
    const agg = aggressionMeta(pets[o.pet_id] ?? 0);
    const unassigned = o.status === 'unassigned';
    const reassignable = isAdmin && !PAST.includes(o.status);
    return (
      <div key={o.id} className="overflow-hidden rounded-card border border-line bg-white shadow-card">
        {isAdmin && (
          <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-alt px-4 py-2">
            {unassigned ? (
              <>
                <label className="flex items-center gap-2 text-[13px] font-semibold text-plum">
                  <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} className="h-4 w-4 accent-plum" />
                  Unassigned
                </label>
                <button onClick={() => setPicker({ ids: [o.id], date: o.date_of_appointment })} className="min-h-[36px] rounded-full bg-plum px-4 text-[13px] font-bold text-white">Assign</button>
              </>
            ) : (
              <>
                <span className="truncate text-[13px] font-semibold text-ink">👤 {staffName[o.supplier_assigned] ?? 'Assigned'}</span>
                {reassignable && <button onClick={() => setPicker({ ids: [o.id], date: o.date_of_appointment })} className="min-h-[36px] rounded-full border-[1.5px] border-plum px-4 text-[13px] font-bold text-plum">Reassign</button>}
              </>
            )}
          </div>
        )}
        <Link href={`/ops/trip/dermacare/${o.id}`} className="block p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[13px] font-semibold text-muted">{fmtApptDateTime(o.date_of_appointment, o.time_of_appointment)}</span>
            <span className="shrink-0 text-[16px] font-bold text-ink">{rupees(amounts[o.id] ?? Number(o.total_amount ?? 0))}</span>
          </div>
          <p className="mt-2 text-[16px] font-bold text-ink">{o.pawparent_name}</p>
          <p className="mt-1 text-[14px] leading-[1.5] text-body line-clamp-3">{o.address_text}</p>
          {(pets[o.pet_id] ?? 0) >= 2 && <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] ${agg.chip}`}>⚠ {agg.label}</span>}
        </Link>
        <div className="grid grid-cols-2 border-t border-line">
          <a href={`tel:${o.phone_number}`} className="flex min-h-[48px] items-center justify-center gap-2 border-r border-line text-[14px] font-bold text-plum">📞 Call</a>
          <a href={navUrl(o.lat, o.lng, o.address_text)} target="_blank" rel="noreferrer" className="flex min-h-[48px] items-center justify-center gap-2 bg-plum text-[14px] font-bold text-white">▲ Navigate</a>
        </div>
      </div>
    );
  };

  const selectedList = orders ? orders.filter(o => selected.has(o.id)) : [];

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-extrabold tracking-[-0.5px] text-ink">✨ Dermacare Jobs</h1>
        <NewBookingAlert orders={orders} vertical="dermacare" label="Dermacare" />
      </div>

      <Segmented value={tab} onChange={v => { setTab(v as any); setSelected(new Set()); }}
        options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]} />

      {isAdmin && (
        <div className="mt-3 flex flex-wrap gap-2">
          {['all', 'unassigned', 'assigned', 'on_the_way', 'in_progress', 'delivered', 'cancelled'].map(s => (
            <SelectChip key={s} label={s === 'all' ? 'All' : (STATUS_META[s]?.label ?? s)} selected={statusFilter === s} onClick={() => setStatusFilter(s)} />
          ))}
        </div>
      )}

      {error ? <ErrorState onRetry={load} />
        : !orders ? <LoadingState label="Loading jobs…" />
        : tab === 'upcoming' ? (
          todays.length === 0 && upcoming.length === 0
            ? <EmptyState emoji="✨" title="No upcoming jobs" sub="New Dermacare bookings will appear here." />
            : (
              <div className="mt-5 space-y-6">
                {todays.length > 0 && <section><h2 className="mb-3 text-[18px] font-bold text-ink">Today&apos;s Bookings</h2><div className="space-y-3">{todays.map(card)}</div></section>}
                {upcoming.length > 0 && <section><h2 className="mb-3 text-[18px] font-bold text-ink">Upcoming</h2><div className="space-y-3">{upcoming.map(card)}</div></section>}
              </div>
            )
        ) : (
          past.length === 0 ? <EmptyState emoji="📋" title="No past jobs yet" sub="Completed and cancelled jobs show here." />
            : <div className="mt-5 space-y-3">{past.map(card)}</div>
        )}

      {/* GAP 4 — bulk assign bar (portaled to body so it stays pinned above the ops bottom nav) */}
      {isAdmin && selected.size > 0 && (
        <Portal>
          <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom))] left-1/2 z-30 w-full max-w-2xl -translate-x-1/2 border-t border-line bg-white px-5 pb-3 pt-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelected(new Set())} className="text-[13px] font-semibold text-muted">Clear</button>
              <button onClick={() => setPicker({ ids: Array.from(selected), date: selectedList[0]?.date_of_appointment ?? todayISO() })}
                className="flex min-h-[52px] flex-1 items-center justify-center rounded-btn bg-plum text-[15px] font-bold text-white">
                Assign {selected.size} job{selected.size === 1 ? '' : 's'} to a groomer
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* Assignment / reassignment picker with workload intelligence */}
      <Sheet open={!!picker} onClose={() => setPicker(null)} title={`Assign ${picker?.ids.length ?? 0} job${picker && picker.ids.length === 1 ? '' : 's'} · ${picker ? fmtApptDateTime(picker.date) : ''}`}>
        {groomerStats.length === 0 ? (
          <p className="py-2 text-[14px] text-muted">No active Dermacare groomers. Add one (with the Dermacare vertical) in Team.</p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {groomerStats.map(({ g, dayCount, conflict }) => (
              <button key={g.id} disabled={assigning} onClick={() => assign(g.id)}
                className="flex w-full items-center justify-between gap-3 rounded-card border border-line p-3 text-left disabled:opacity-50">
                <span className="min-w-0">
                  <span className="block font-bold text-ink">{g.name}</span>
                  <span className="block text-[12px] text-muted">{g.phone_number ?? 'no phone'} · {dayCount} job{dayCount === 1 ? '' : 's'} on {fmtApptDateTime(picker!.date)}</span>
                  {conflict && <span className="mt-0.5 block text-[12px] font-semibold text-danger">⚠ Has a job within 2h of this slot</span>}
                </span>
                <span className="shrink-0 rounded-full bg-plum-soft px-3 py-1 text-[12px] font-bold text-plum">{dayCount}</span>
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setPicker(null)} className="mt-3 w-full py-3 text-[15px] font-semibold text-muted">Cancel</button>
      </Sheet>
    </main>
  );
}
