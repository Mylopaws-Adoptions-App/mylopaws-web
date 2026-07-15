'use client';
import { useCallback, useEffect, useState } from 'react';
import { useStaff } from '@/components/OpsContext';
import { supabase } from '@/lib/supabase';
import { HomesOrder, STATUS_META } from '@/lib/types';
import { PillButton, Field, Sheet, LoadingState, EmptyState } from '@/components/design';
import { toast } from '@/lib/toast';

// Homes lifecycle differs from travel/dermacare: no supplier, WhatsApp-driven (no push).
const SECTIONS = ['requested', 'confirmed', 'in_stay', 'completed', 'cancelled'] as const;
const NEXT: Record<string, { next: string; label: string }> = {
  requested: { next: 'confirmed', label: 'Confirm booking' },
  confirmed: { next: 'in_stay', label: 'Check in 🏡' },
  in_stay: { next: 'completed', label: 'Mark completed ✓' },
};

function badge(status: string) {
  const label = STATUS_META[status]?.label ?? status;
  const tone = ['confirmed', 'in_stay'].includes(status) ? 'bg-mint/50 text-ink'
    : status === 'completed' ? 'bg-surface-alt text-muted'
    : status === 'cancelled' ? 'bg-danger/10 text-danger'
    : 'bg-plum-soft text-plum';
  return <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${tone}`}>{label}</span>;
}

function ActBtn({ children, onClick, tone = 'primary' }: {
  children: React.ReactNode; onClick?: () => void; tone?: 'primary' | 'danger';
}) {
  const tones = { primary: 'bg-plum text-white', danger: 'border-[1.5px] border-danger text-danger bg-white' };
  return (
    <button onClick={onClick} className={`flex min-h-[44px] items-center justify-center rounded-full px-4 text-[13px] font-bold ${tones[tone]}`}>
      {children}
    </button>
  );
}

export default function HomesBoard() {
  const { me } = useStaff();
  const isAdmin = me?.role === 'admin';

  const [orders, setOrders] = useState<HomesOrder[] | null>(null);
  const [cancelFor, setCancelFor] = useState<HomesOrder | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('homes_orders').select('*').order('created_at', { ascending: false }).limit(200);
    setOrders((data as HomesOrder[]) ?? []);
  }, []);

  useEffect(() => { if (me) load(); }, [load, me]);
  useEffect(() => {
    const ch = supabase.channel('board-homes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homes_orders' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const setStatus = async (order: HomesOrder, status: string, extra: object = {}) => {
    const { error } = await supabase.from('homes_orders').update({ status, ...extra }).eq('id', order.id);
    if (error) { toast(error.message, 'error'); return; }
    load();
  };

  if (!orders) return <LoadingState label="Loading cat boarding…" />;

  return (
    <main className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="text-[24px] font-extrabold tracking-[-0.5px] text-ink">🐱 Cat Boarding {isAdmin ? 'Board' : ''}</h1>

      {orders.length === 0 && <EmptyState emoji="🐱" title="No boarding requests yet" sub="New stay requests will appear here." />}

      {SECTIONS.map(section => {
        const rows = orders.filter(o => o.status === section);
        if (orders.length === 0) return null;
        return (
          <section key={section} className="mt-6">
            <h2 className="text-[15px] font-bold text-plum">{STATUS_META[section]?.label ?? section} <span className="text-muted">({rows.length})</span></h2>
            {rows.length === 0 && <p className="mt-1 text-[13px] text-muted">None</p>}
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {rows.map(o => {
                const step = NEXT[o.status];
                return (
                  <div key={o.id} className="rounded-card border border-line bg-white p-4 shadow-card">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[15px] font-bold text-ink">#{o.id} · {o.furbaby_name} ({o.pawparent_name})</span>
                      {badge(o.status)}
                    </div>
                    <div className="mt-2 space-y-1 text-[14px] text-body">
                      <p>🏡 {o.provider}</p>
                      <p>📅 {o.check_in} → {o.check_out} · {o.nights} night{o.nights === 1 ? '' : 's'} · {o.num_cats} cat{o.num_cats === 1 ? '' : 's'}</p>
                      <p>💰 Est ₹{o.total_estimate} (₹{o.rate_per_night}/night)</p>
                      <p><a className="text-plum underline" href={`tel:${o.phone_number}`}>📞 {o.phone_number}</a></p>
                      {o.notes && <p className="text-muted">📝 {o.notes}</p>}
                      {o.cancel_reason && <p className="text-[12px] text-danger">Reason: {o.cancel_reason}</p>}
                    </div>
                    {isAdmin && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {step && <ActBtn onClick={() => setStatus(o, step.next)}>{step.label}</ActBtn>}
                        {!['completed', 'cancelled'].includes(o.status) && <ActBtn tone="danger" onClick={() => setCancelFor(o)}>Cancel</ActBtn>}
                        <a href={`https://wa.me/${o.phone_number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi! About your cat boarding request #${o.id}`)}`}
                          target="_blank" rel="noreferrer"
                          className="flex min-h-[44px] items-center justify-center rounded-full border-[1.5px] border-plum px-4 text-[13px] font-bold text-plum">💬 WhatsApp</a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <Sheet open={!!cancelFor} onClose={() => { setCancelFor(null); setReason(''); }} title={cancelFor ? `Cancel boarding #${cancelFor.id}` : ''}>
        <Field label="Reason (required — audit-logged)" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Dates unavailable, customer requested" />
        <button
          className="flex min-h-[52px] w-full items-center justify-center rounded-btn bg-danger text-[15px] font-bold text-white"
          onClick={async () => {
            if (!reason.trim()) { toast('Every cancellation needs a reason — it goes to the audit trail.', 'error'); return; }
            await setStatus(cancelFor!, 'cancelled', { cancel_reason: reason.trim() });
            setCancelFor(null); setReason('');
          }}>Cancel booking</button>
        <button onClick={() => { setCancelFor(null); setReason(''); }} className="mt-2 w-full py-3 text-[15px] font-semibold text-muted">Keep booking</button>
      </Sheet>
    </main>
  );
}
