'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { track } from '@/lib/analytics';
import { useShop } from '@/components/shop/ShopProvider';
import PhoneAuthSheet from '@/components/PhoneAuthSheet';
import { EmptyState, ErrorState, PageShell, PillButton, SkeletonList } from '@/components/design';
import { PRODUCT_COLS, ShopError, inr, shopFn, toProduct } from '@/lib/shop';

type Order = {
  id: string; order_number: number; created_at: string; items: { handle: string; title: string; qty: number; line_total?: number }[];
  total: number; delivery_fee: number; status: string; payment_status: string; delivery_status: string | null; fulfilment: string | null;
  promised_date: string | null; tracking_url: string | null; rx_status: string | null; can_cancel: boolean;
};

const STEPS = ['Placed', 'Paid', 'On the way', 'Delivered'];
function stage(o: Order): { idx: number; label: string; tone: 'ok' | 'wait' | 'bad' } {
  if (o.status === 'cancelled' || o.status === 'cancel_requested' || o.delivery_status === 'cancelled')
    return { idx: -1, label: o.payment_status === 'paid' ? 'Cancelled · refund started' : 'Cancelled', tone: 'bad' };
  if (o.payment_status !== 'paid') return { idx: 0, label: o.payment_status === 'failed' ? 'Payment failed' : 'Awaiting payment', tone: 'wait' };
  if (o.delivery_status === 'delivered' || o.status === 'completed') return { idx: 3, label: o.fulfilment === 'pickup' ? 'Collected' : 'Delivered', tone: 'ok' };
  if (['shipped', 'out_for_delivery', 'ready_for_pickup', 'packed'].includes(String(o.delivery_status)))
    return { idx: 2, label: o.fulfilment === 'pickup' ? 'Ready to collect' : 'On the way', tone: 'ok' };
  if (o.rx_status === 'received') return { idx: 1, label: 'Paid · prescription being checked', tone: 'ok' };
  return { idx: 1, label: 'Paid · being packed', tone: 'ok' };
}
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const fmtDay = (ymd: string) => new Date(ymd + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export default function OrdersPage() {
  const router = useRouter();
  const { session, authReady, setQty, support } = useShop();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [err, setErr] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setErr(false);
    shopFn<{ orders: Order[] }>('orders').then((r) => setOrders(r.orders)).catch(() => setErr(true));
  }, []);
  useEffect(() => { if (session) load(); }, [session, load]);

  const buyAgain = async (o: Order) => {
    const qty = new Map(o.items.map((i) => [i.handle, i.qty]));
    const { data } = await supabase.from('shop_products').select(PRODUCT_COLS).in('handle', Array.from(qty.keys()));
    const ok = (data ?? []).map(toProduct).filter((p) => p.in_stock && !p.vaccine);
    ok.forEach((p) => setQty(p, qty.get(p.handle) ?? 1));
    track('reorder', { order: o.order_number, items: ok.length });
    if (ok.length) { toast(`${ok.length} item${ok.length > 1 ? 's' : ''} added to your cart`, 'success'); router.push('/cart'); }
    else toast('These items are out of stock right now', 'error');
  };

  const cancel = async (o: Order) => {
    setBusy(o.id);
    try {
      const r = await shopFn<{ refunded: boolean; paid: boolean }>('cancel', { order_id: o.id });
      toast(r.paid ? (r.refunded ? 'Cancelled. Refund started (5–7 working days).' : 'Cancelled. Our team will process your refund.') : 'Order cancelled', 'success');
      track('cancel_order', { order: o.order_number });
      load();
    } catch (e) {
      toast((e as ShopError).message, 'error');
    } finally { setBusy(null); setConfirming(null); }
  };

  if (authReady && !session) {
    return (
      <PageShell variant="plum" size="large" title="Orders">
        <EmptyState emoji="📦" title="Sign in to see your orders" sub="Use the phone number you ordered with." action={{ label: 'Sign in', onClick: () => setAuthOpen(true) }} />
        <PhoneAuthSheet open={authOpen} onClose={() => setAuthOpen(false)} onVerified={() => setAuthOpen(false)} />
      </PageShell>
    );
  }

  return (
    <PageShell variant="plum" size="large" title="Orders" subtitle="Track, reorder or cancel">
      {err ? <ErrorState onRetry={load} /> : !orders ? <SkeletonList count={3} lines={3} /> : !orders.length ? (
        <EmptyState emoji="📦" title="No orders yet" sub="Your shop orders will show up here." action={{ label: 'Start shopping', onClick: () => router.push('/') }} />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const s = stage(o);
            return (
              <article key={o.id} className="rounded-card border border-line bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[16px] font-bold text-ink">Order #{o.order_number}</p>
                    <p className="text-[12px] text-muted">{fmt(o.created_at)} · {o.fulfilment === 'pickup' ? 'Store pickup' : 'Delivery'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${s.tone === 'bad' ? 'bg-danger/10 text-danger' : s.tone === 'wait' ? 'bg-butter text-ink' : 'bg-success/10 text-success'}`}>{s.label}</span>
                </div>

                {s.idx >= 0 && (
                  <ol className="mt-3 flex items-center gap-1" aria-label="Order progress">
                    {STEPS.map((st, i) => (
                      <li key={st} className="flex flex-1 flex-col items-center gap-1">
                        <span className={`h-1.5 w-full rounded-full ${i <= s.idx ? 'bg-plum' : 'bg-line'}`} />
                        <span className={`text-[10px] ${i <= s.idx ? 'font-bold text-plum' : 'text-muted'}`}>{o.fulfilment === 'pickup' && i === 2 ? 'Ready' : st}</span>
                      </li>
                    ))}
                  </ol>
                )}

                <ul className="mt-3 space-y-0.5 text-[13px] text-body">
                  {o.items.slice(0, 4).map((i) => <li key={i.handle} className="truncate">{i.qty} × <Link href={`/p/${i.handle}`} className="underline-offset-2 hover:underline">{i.title}</Link></li>)}
                  {o.items.length > 4 && <li className="text-muted">+ {o.items.length - 4} more</li>}
                </ul>
                <div className="mt-2 flex items-center justify-between text-[14px]">
                  <span className="text-muted">{o.promised_date && s.idx >= 1 && s.idx < 3 && o.fulfilment !== 'pickup' ? `Expected ${fmtDay(o.promised_date)}` : ''}</span>
                  <span className="font-bold text-ink">{inr(o.total)}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => buyAgain(o)} className="min-h-[40px] rounded-full bg-plum px-4 text-[13px] font-bold text-white">Buy again</button>
                  {o.tracking_url && <a href={o.tracking_url} target="_blank" rel="noreferrer" className="flex min-h-[40px] items-center rounded-full border-[1.5px] border-plum px-4 text-[13px] font-bold text-plum">Track</a>}
                  <a href={`https://wa.me/${support}?text=${encodeURIComponent(`Hi Mylopaws, about order #${o.order_number}`)}`} target="_blank" rel="noreferrer" className="flex min-h-[40px] items-center rounded-full border border-line px-4 text-[13px] font-semibold text-body">Help</a>
                  {o.can_cancel && confirming !== o.id && <button type="button" onClick={() => setConfirming(o.id)} className="min-h-[40px] px-2 text-[13px] font-semibold text-danger">Cancel</button>}
                </div>
                {confirming === o.id && (
                  <div className="mt-3 rounded-card bg-danger/5 p-3">
                    <p className="text-[13px] text-body">Cancel order #{o.order_number}? {o.payment_status === 'paid' ? `${inr(o.total)} goes back to your original payment method.` : 'Nothing has been charged.'}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <PillButton variant="secondary" onClick={() => setConfirming(null)}>Keep order</PillButton>
                      <button type="button" disabled={busy === o.id} onClick={() => cancel(o)} className="min-h-[54px] rounded-btn bg-danger text-[15px] font-bold text-white disabled:opacity-60">{busy === o.id ? 'Cancelling…' : 'Yes, cancel'}</button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          <p className="pt-2 text-center text-[12px] text-muted">Looking for Travel or Dermacare bookings? <Link href="/bookings" className="underline">See past bookings</Link></p>
        </div>
      )}
    </PageShell>
  );
}
