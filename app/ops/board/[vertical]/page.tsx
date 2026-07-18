'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useStaff } from '@/components/OpsContext';
import { supabase, invokeFn } from '@/lib/supabase';
import { NEXT_STATUS, OrderStatus, STATUS_META, Staff } from '@/lib/types';
import { PillButton, Field, Sheet, LoadingState } from '@/components/design';
import DermacareBoard from '@/components/ops/DermacareBoard';
import { toast } from '@/lib/toast';

const SECTIONS: OrderStatus[] = ['unassigned', 'assigned', 'on_the_way', 'in_progress', 'delivered', 'cancelled'];

function badge(status: string) {
  const label = STATUS_META[status]?.label ?? status;
  const tone = ['on_the_way', 'in_progress'].includes(status) ? 'bg-mint/50 text-ink'
    : ['delivered', 'completed'].includes(status) ? 'bg-surface-alt text-muted'
    : status === 'cancelled' ? 'bg-danger/10 text-danger'
    : 'bg-plum-soft text-plum';
  return <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${tone}`}>{label}</span>;
}

// Compact action button for the dense ops cards (tap target >= 44px).
function ActBtn({ children, onClick, tone = 'primary', className = '' }: {
  children: React.ReactNode; onClick?: () => void; tone?: 'primary' | 'secondary' | 'danger' | 'dark'; className?: string;
}) {
  const tones = {
    primary: 'bg-plum text-white',
    secondary: 'border-[1.5px] border-plum text-plum bg-white',
    danger: 'border-[1.5px] border-danger text-danger bg-white',
    dark: 'bg-ink text-white',
  };
  return (
    <button onClick={onClick} className={`flex min-h-[44px] items-center justify-center rounded-full px-4 text-[13px] font-bold ${tones[tone]} ${className}`}>
      {children}
    </button>
  );
}

export default function Board() {
  const { vertical } = useParams<{ vertical: 'travel' | 'dermacare' }>();
  // Dermacare uses the groomer-workflow board (ops-design skill); Travel keeps the existing board.
  if (vertical === 'dermacare') return <DermacareBoard />;
  return <TravelBoard />;
}

function TravelBoard() {
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
    // Payment gate: only ops-visible once the Razorpay webhook has verified payment
    // (payment_status='paid'). pending_payment / failed / abandoned never reach the board.
    let q = supabase.from(table).select('*').eq('payment_status', 'paid').order('created_at', { ascending: false }).limit(200);
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
    if (error) { toast(error.message, 'error'); return; }
    invokeFn('send-push', { mode: 'status', order_type: vertical, order_id: order.id, status }).catch(() => {});
    load();
  };

  if (!orders) return <LoadingState label={`Loading ${vertical} orders…`} />;
  const visible = isAdmin ? SECTIONS : SECTIONS.filter(s => s !== 'unassigned' && s !== 'cancelled');

  return (
    <main className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="text-[24px] font-extrabold tracking-[-0.5px] text-ink">{vertical === 'travel' ? '🚗 Travel' : '✨ Dermacare'} {isAdmin ? 'Board' : '— My Jobs'}</h1>

      {visible.map(section => {
        const rows = orders.filter(o => o.status === section);
        return (
          <section key={section} className="mt-6">
            <h2 className="text-[15px] font-bold text-plum">{STATUS_META[section].label} <span className="text-muted">({rows.length})</span></h2>
            {rows.length === 0 && <p className="mt-1 text-[13px] text-muted">None</p>}
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {rows.map(o => {
                const sup = suppliers.find(s => s.id === o.supplier_assigned);
                const step = NEXT_STATUS[o.status as OrderStatus];
                const live = o.status === 'on_the_way' || o.status === 'in_progress';
                return (
                  <div key={o.id} className="rounded-card border border-line bg-white p-4 shadow-card">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[15px] font-bold text-ink">#{o.id} · {o.furbaby_name} ({o.pawparent_name})</span>
                      {badge(o.status)}
                    </div>
                    <div className="mt-2 space-y-1 text-[14px] text-body">
                      {vertical === 'travel' ? (<>
                        <p><a className="text-plum underline" href={o.pickup_maps_link ?? '#'} target="_blank" rel="noreferrer">📍 {o.pickup_address?.split(',').slice(0, 2).join(',')}</a></p>
                        <p><a className="text-plum underline" href={o.drop_maps_link ?? '#'} target="_blank" rel="noreferrer">🏁 {o.drop_address?.split(',').slice(0, 2).join(',')}</a></p>
                        <p>🗓 {o.date_of_travel} · {o.time_of_travel} {o.distance_km ? `· ${o.distance_km} km` : ''}</p>
                        {o.fare_estimate && <p>💰 Est ₹{o.fare_estimate} (fee ₹{o.booking_fee} paid)</p>}
                      </>) : (<>
                        <p>✨ {o.therapy_names}</p>
                        <p><a className="text-plum underline" href={o.address_maps_link ?? '#'} target="_blank" rel="noreferrer">🏠 {o.address_text?.split(',').slice(0, 2).join(',')}</a></p>
                        <p>🗓 {o.date_of_appointment} · {o.time_of_appointment} {o.total_amount ? `· ₹${o.total_amount}` : ''}</p>
                      </>)}
                      <p><a className="text-plum underline" href={`tel:${o.phone_number}`}>📞 {o.phone_number}</a></p>
                      {(o.aggressive || o.rescue || o.critical) && (
                        <p className="text-[12px] font-semibold text-danger">
                          {[o.aggressive && '⚠️ aggressive', o.rescue && '🏳️ rescue', o.critical && '🩺 critical'].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {sup && <p className="font-bold text-plum">👷 {sup.name}</p>}
                      {o.cancel_reason && <p className="text-[12px] text-danger">Reason: {o.cancel_reason}</p>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {isAdmin && o.status === 'unassigned' && <ActBtn className="flex-1" onClick={() => setAssignFor(o)}>Assign</ActBtn>}
                      {live && <Link href={`/ops/trip/${vertical}/${o.id}`} className="flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-ink px-4 text-[13px] font-bold text-white">🗺 Trip screen</Link>}
                      {!isAdmin && step && !live && <Link href={`/ops/trip/${vertical}/${o.id}`} className="flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-ink px-4 text-[13px] font-bold text-white">{step.label}</Link>}
                      {isAdmin && step && <ActBtn tone="secondary" className="flex-1" onClick={() => setStatus(o, step.next)}>→ {STATUS_META[step.next].label}</ActBtn>}
                      {isAdmin && !['delivered', 'cancelled'].includes(o.status) && <ActBtn tone="danger" onClick={() => setCancelFor(o)}>Cancel</ActBtn>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <Sheet open={!!assignFor} onClose={() => setAssignFor(null)} title={assignFor ? `Assign supplier — #${assignFor.id}` : ''}>
        <div className="max-h-80 overflow-y-auto">
          {suppliers.map(s => (
            <button key={s.id} onClick={async () => { await setStatus(assignFor, 'assigned', { supplier_assigned: s.id }); setAssignFor(null); }}
              className="block w-full border-b border-line py-3 text-left last:border-0">
              <span className="font-bold text-ink">{s.name}</span>
              <span className="block text-[12px] text-muted">{[s.vehicle_type, s.phone_number].filter(Boolean).join(' · ')}</span>
            </button>
          ))}
          {suppliers.length === 0 && <p className="py-2 text-[14px] text-muted">No active suppliers. Add one in Team.</p>}
        </div>
        <button onClick={() => setAssignFor(null)} className="mt-4 w-full py-3 text-[15px] font-semibold text-muted">Close</button>
      </Sheet>

      <Sheet open={!!cancelFor} onClose={() => { setCancelFor(null); setReason(''); }} title={cancelFor ? `Cancel booking #${cancelFor.id}` : ''}>
        <Field label="Reason (required — audit-logged)" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Customer requested, no supplier available" />
        <button
          className="flex min-h-[52px] w-full items-center justify-center rounded-btn bg-danger text-[15px] font-bold text-white"
          onClick={async () => {
            if (!reason.trim()) { toast('Every cancellation needs a reason — it goes to the audit trail.', 'error'); return; }
            await setStatus(cancelFor, 'cancelled', { cancel_reason: reason.trim() });
            setCancelFor(null); setReason('');
          }}>Cancel booking</button>
        <button onClick={() => { setCancelFor(null); setReason(''); }} className="mt-2 w-full py-3 text-[15px] font-semibold text-muted">Keep booking</button>
      </Sheet>
    </main>
  );
}
