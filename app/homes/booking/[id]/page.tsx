'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { Badge, Card, Spinner } from '@/components/ui';
import { HomesOrder, HOMES_WHATSAPP, STATUS_META } from '@/lib/types';

const STEPS = ['requested', 'confirmed', 'in_stay', 'completed'];

function Booking() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<HomesOrder | null>(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('homes_orders').select('*').eq('id', Number(id)).maybeSingle();
    if (!data) { setMissing(true); return; }
    setOrder(data as HomesOrder);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const ch = supabase.channel(`homes-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'homes_orders', filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, load]);

  if (missing) return <main className="mx-auto max-w-2xl px-5 py-16 text-center"><p className="text-ink-soft">Booking not found.</p><Link href="/homes" className="mt-3 inline-block font-bold text-magenta">← Back to Homes</Link></main>;
  if (!order) return <Spinner label="Loading booking…" />;
  const stepIdx = STEPS.indexOf(order.status);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-black">🐱 Boarding #{order.id}</h1>
        <Badge status={order.status} />
      </div>

      {order.status === 'requested' && (
        <Card className="mt-4 !border-brass bg-[#FFF9EC]">
          <p className="font-bold text-magenta">Request received! 🎉</p>
          <p className="mt-1 text-sm text-ink-soft">We’ve sent your dates to {order.provider}. You’ll get a WhatsApp confirmation shortly — no payment until it’s confirmed.</p>
        </Card>
      )}
      {order.status === 'cancelled' && (
        <Card className="mt-4 !border-red-300"><p className="font-bold text-red-600">Cancelled{order.cancel_reason ? `: ${order.cancel_reason}` : ''}</p></Card>
      )}

      <Card className="mt-4">
        <p className="mb-2 font-bold text-magenta">Status</p>
        {STEPS.map((st, i) => (
          <div key={st} className="mb-1.5 flex items-center gap-2">
            <span>{stepIdx >= 0 && i <= stepIdx ? '🟣' : '⚪️'}</span>
            <span className={stepIdx >= 0 && i <= stepIdx ? 'font-bold' : 'text-ink-soft'}>{STATUS_META[st].label}</span>
          </div>
        ))}
      </Card>

      <Card className="mt-3 space-y-1.5 text-[15px]">
        <p className="font-bold text-magenta">Details</p>
        <p>🏡 {order.provider}</p>
        <p>📅 {order.check_in} → {order.check_out} · {order.nights} night{order.nights === 1 ? '' : 's'}</p>
        <p>🐾 {order.furbaby_name} · {order.num_cats} cat{order.num_cats === 1 ? '' : 's'}</p>
        <p>💰 Est. ₹{order.total_estimate} (₹{order.rate_per_night}/night)</p>
        {order.notes && <p className="text-ink-soft">📝 {order.notes}</p>}
      </Card>

      <a href={`https://wa.me/${HOMES_WHATSAPP}?text=${encodeURIComponent(`Hi! About my cat boarding request #${order.id}`)}`}
        target="_blank" rel="noreferrer"
        className="mt-4 mb-8 flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-magenta font-bold text-magenta hover:bg-magenta/5">
        💬 Chat with us on WhatsApp
      </a>
    </main>
  );
}
export default function Page() { return <AuthGate><><Nav /><Booking /></></AuthGate>; }
