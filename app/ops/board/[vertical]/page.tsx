'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useStaff } from '@/components/OpsContext';
import { supabase, invokeFn } from '@/lib/supabase';
import { Badge, Btn, Card, Chip, Empty, Field, Spinner } from '@/components/ui';
import { NEXT_STATUS, OrderStatus, STATUS_META, Staff } from '@/lib/types';

const SECTIONS: OrderStatus[] = ['unassigned', 'assigned', 'on_the_way', 'in_progress', 'delivered', 'cancelled'];

export default function Board() {
  const { vertical } = useParams<{ vertical: 'travel' | 'dermacare' }>();
  const table = vertical === 'travel' ? 'orders' : 'dermacare_orders';
  const { me } = useStaff();
  const isAdmin = me?.role === 'admin';

  const [orders, setOrders] = useState<any[] | null>(null);
  const [suppliers, setSuppliers] = useState<Staff[]>([]);
  const [assignFor, setAssignFor] = useState<any | null>(null);
  const [cancelFor, setCancelFor] = useState<any | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    let q = supabase.from(table).select('*').order('created_at', { ascending: false }).limit(200);
    if (!isAdmin && me) q = q.eq('supplier_assigned', me.id);
    const [{ data: o }, { data: s }] = await Promise.all([
      q, supabase.from('staff').select('*').eq('role', 'supplier').eq('active', true),
    ]);
    setOrders(o ?? []); setSuppliers((s as Staff[]) ?? []);
  }, [table, isAdmin, me]);

  useEffect(() => { if (me) load(); }, [load, me]);
  useEffect(() => {
    const ch = supabase.channel(`board-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [table, load]);

  const setStatus = async (order: any, status: OrderStatus, extra: object = {}) => {
    const { error } = await supabase.from(table).update({ status, ...extra }).eq('id', order.id);
    if (error) { alert(error.message); return; }
    invokeFn('send-push', { mode: 'status', order_type: vertical, order_id: order.id, status }).catch(() => {});
    load();
  };

  if (!orders) return <Spinner label={`Loading ${vertical} orders…`} />;
  const visible = isAdmin ? SECTIONS : SECTIONS.filter(s => s !== 'unassigned' && s !== 'cancelled');

  return (
    <main className="mx-auto max-w-5xl px-5 py-6">
      <h1 className="font-display text-2xl font-black">{vertical === 'travel' ? '🚗 Travel' : '✨ Dermacare'} {isAdmin ? 'Board' : '— My Jobs'}</h1>
      {visible.map(section => {
        const rows = orders.filter(o => o.status === section);
        return (
          <section key={section} className="mt-6">
            <h2 className="font-bold text-night">{STATUS_META[section].label} <span className="text-ink-soft">({rows.length})</span></h2>
            {rows.length === 0 && <p className="mt-1 text-sm text-ink-soft">None</p>}
            <div className="mt-2 grid gap-3 lg:grid-cols-2">
              {rows.map(o => {
                const sup = suppliers.find(s => s.id === o.supplier_assigned);
                const step = NEXT_STATUS[o.status as OrderStatus];
                const live = o.status === 'on_the_way' || o.status === 'in_progress';
                return (
                  <Card key={o.id}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">#{o.id} · {o.furbaby_name} ({o.pawparent_name})</span>
                      <Badge status={o.status} />
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      {vertical === 'travel' ? (<>
                        <p><a className="text-blue-700 underline" href={o.pickup_maps_link ?? '#'} target="_blank" rel="noreferrer">📍 {o.pickup_address?.split(',').slice(0, 2).join(',')}</a></p>
                        <p><a className="text-blue-700 underline" href={o.drop_maps_link ?? '#'} target="_blank" rel="noreferrer">🏁 {o.drop_address?.split(',').slice(0, 2).join(',')}</a></p>
                        <p>🗓 {o.date_of_travel} · {o.time_of_travel} {o.distance_km ? `· ${o.distance_km} km` : ''}</p>
                        {o.fare_estimate && <p>💰 Est ₹{o.fare_estimate} (fee ₹{o.booking_fee} paid)</p>}
                      </>) : (<>
                        <p>✨ {o.therapy_names}</p>
                        <p><a className="text-blue-700 underline" href={o.address_maps_link ?? '#'} target="_blank" rel="noreferrer">🏠 {o.address_text?.split(',').slice(0, 2).join(',')}</a></p>
                        <p>🗓 {o.date_of_appointment} · {o.time_of_appointment} {o.total_amount ? `· ₹${o.total_amount}` : ''}</p>
                      </>)}
                      <p><a className="text-blue-700 underline" href={`tel:${o.phone_number}`}>📞 {o.phone_number}</a></p>
                      {(o.aggressive || o.rescue || o.critical) && (
                        <p className="text-xs font-semibold text-red-600">
                          {[o.aggressive && '⚠️ aggressive', o.rescue && '🏳️ rescue', o.critical && '🩺 critical'].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {sup && <p className="font-bold text-magenta">👷 {sup.name}</p>}
                      {o.cancel_reason && <p className="text-xs text-red-600">Reason: {o.cancel_reason}</p>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {isAdmin && o.status === 'unassigned' && <Btn onClick={() => setAssignFor(o)} className="!min-h-[40px] flex-1 text-sm">Assign</Btn>}
                      {live && <Link href={`/ops/trip/${vertical}/${o.id}`} className="flex min-h-[40px] flex-1 items-center justify-center rounded-2xl bg-night px-4 text-sm font-bold text-white">🗺 Trip screen</Link>}
                      {!isAdmin && step && !live && <Link href={`/ops/trip/${vertical}/${o.id}`} className="flex min-h-[40px] flex-1 items-center justify-center rounded-2xl bg-night px-4 text-sm font-bold text-white">{step.label}</Link>}
                      {isAdmin && step && <Btn kind="ghost" onClick={() => setStatus(o, step.next)} className="!min-h-[40px] flex-1 text-sm">→ {STATUS_META[step.next].label}</Btn>}
                      {isAdmin && !['delivered', 'cancelled'].includes(o.status) && <Btn kind="danger" onClick={() => setCancelFor(o)} className="!min-h-[40px] text-sm">Cancel</Btn>}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      {assignFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={() => setAssignFor(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-black">Assign supplier — #{assignFor.id}</h3>
            <div className="mt-3 max-h-80 overflow-y-auto">
              {suppliers.map(s => (
                <button key={s.id} onClick={async () => { await setStatus(assignFor, 'assigned', { supplier_assigned: s.id }); setAssignFor(null); }}
                  className="block w-full border-b border-line py-3 text-left hover:bg-cream">
                  <span className="font-bold">{s.name}</span>
                  <span className="block text-xs text-ink-soft">{[s.vehicle_type, s.phone_number].filter(Boolean).join(' · ')}</span>
                </button>
              ))}
              {suppliers.length === 0 && <p className="text-sm text-ink-soft">No active suppliers. Add one in Team.</p>}
            </div>
            <Btn kind="ghost" onClick={() => setAssignFor(null)} className="mt-4 w-full">Close</Btn>
          </div>
        </div>
      )}

      {cancelFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={() => setCancelFor(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-black">Cancel booking #{cancelFor.id}</h3>
            <Field label="Reason (required — audit-logged)" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Customer requested, no supplier available" />
            <Btn kind="danger" className="w-full" onClick={async () => {
              if (!reason.trim()) { alert('Every cancellation needs a reason — it goes to the audit trail.'); return; }
              await setStatus(cancelFor, 'cancelled', { cancel_reason: reason.trim() });
              setCancelFor(null); setReason('');
            }}>Cancel booking</Btn>
            <Btn kind="ghost" onClick={() => { setCancelFor(null); setReason(''); }} className="mt-2 w-full">Keep booking</Btn>
          </div>
        </div>
      )}
    </main>
  );
}
