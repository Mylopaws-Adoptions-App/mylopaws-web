'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Segmented, Sheet, LoadingState } from '@/components/design';
import { toast } from '@/lib/toast';
import { inr, shopFn } from '@/lib/shop';

// Ops · Shop orders. Every shop order (app, WhatsApp, Instagram, website) in one place.
// Status buttons run the same commands the logistics team sends on WhatsApp, so the customer
// is messaged exactly as before. Layout follows the ops-design skill: To do / Done, job cards with
// a Call | Navigate split bar, payment badge first, one primary action per card.

type Item = { title: string; qty: number; line_total?: number };
type Order = {
  id: string; order_number: number; created_at: string; paid_at: string | null; customer_name: string | null; customer_phone: string | null;
  items: Item[]; total: number; delivery_fee: number; status: string; payment_status: string; delivery_status: string | null;
  fulfilment: string | null; shipping_address: Record<string, string> | null; pincode: string | null; channel: string | null;
  promised_date: string | null; tracking_url: string | null; rx_status: string | null; prescription_id: string | null;
  logistics_acked_at: string | null; logistics_issue: string | null;
};

const CHANNEL: Record<string, string> = { app: 'App', whatsapp: 'WhatsApp', instagram: 'Instagram', chat: 'Chat', web: 'Website' };
const isPickup = (o: Order) => o.fulfilment === 'pickup';
const closed = (o: Order) => ['delivered', 'cancelled'].includes(String(o.delivery_status)) || ['cancelled', 'cancel_requested', 'completed'].includes(o.status);
const addressOf = (o: Order) => {
  const a = o.shipping_address ?? {};
  return [a.line1 ?? a.address, a.line2, a.landmark, a.city, a.pincode ?? o.pincode].filter(Boolean).join(', ');
};
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const day = (ymd: string) => new Date(ymd + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/** The single next step for a paid, open order. */
function next(o: Order): { cmd: string; label: string } | null {
  if (o.payment_status !== 'paid' || closed(o)) return null;
  if (o.rx_status === 'received') return null; // prescription decision comes first
  if (o.rx_status === 'rejected') return null;
  const ds = o.delivery_status ?? 'processing';
  if (!o.logistics_acked_at && ds === 'processing') return { cmd: 'ok', label: 'Accept order' };
  if (ds === 'processing') return { cmd: 'packed', label: isPickup(o) ? 'Packed · tell customer to collect' : 'Mark packed' };
  if (isPickup(o)) return { cmd: 'delivered', label: 'Mark collected' };
  if (ds === 'packed') return { cmd: 'out', label: 'Out for delivery' };
  return { cmd: 'delivered', label: 'Mark delivered' };
}

export default function ShopOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [tab, setTab] = useState<'todo' | 'unpaid' | 'done'>('todo');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [rx, setRx] = useState<{ o: Order; files: { url: string; type: string }[] } | null>(null);
  const [form, setForm] = useState<{ o: Order; kind: 'cancel' | 'issue' | 'eta' | 'rxbad' | 'shipped' } | null>(null);
  const [formText, setFormText] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    shopFn<{ orders: Order[] }>('ops_list', { days: 45 }).then((r) => { setOrders(r.orders); setErr(''); }).catch((e) => setErr(e.message));
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const run = async (o: Order, command: string) => {
    setBusy(o.id);
    try {
      const r = await shopFn<{ reply: string }>('ops_command', { order_number: o.order_number, command });
      toast(r.reply.split('\n')[0].slice(0, 140), 'success');
      load();
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(null); }
  };
  const openRx = async (o: Order) => {
    setBusy(o.id);
    try { const r = await shopFn<{ files: { url: string; type: string }[] }>('ops_rx', { order_id: o.id }); setRx({ o, files: r.files }); }
    catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(null); }
  };

  const groups = useMemo(() => {
    const list = (orders ?? []).filter((o) => {
      const t = q.trim().toLowerCase();
      return !t || String(o.order_number).includes(t) || (o.customer_name ?? '').toLowerCase().includes(t) || (o.customer_phone ?? '').includes(t);
    });
    return {
      todo: list.filter((o) => o.payment_status === 'paid' && !closed(o)).sort((a, b) => a.order_number - b.order_number),
      unpaid: list.filter((o) => o.payment_status !== 'paid' && !closed(o)),
      done: list.filter((o) => closed(o)),
    };
  }, [orders, q]);

  const shown = groups[tab];
  const todoValue = groups.todo.reduce((t, o) => t + Number(o.total), 0);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[22px] font-bold text-ink">Shop orders</h1>
        <button type="button" onClick={load} className="text-[13px] font-semibold text-plum">Refresh</button>
      </div>
      <p className="text-[13px] text-muted">{groups.todo.length} to fulfil · {inr(todoValue)} · all channels</p>

      <div className="mt-3"><Segmented value={tab} onChange={(v) => setTab(v as typeof tab)} options={[
        { value: 'todo', label: `To do (${groups.todo.length})` },
        { value: 'unpaid', label: `Unpaid (${groups.unpaid.length})` },
        { value: 'done', label: 'Done' },
      ]} /></div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order #, name or phone" aria-label="Search orders"
        className="mt-3 min-h-[44px] w-full rounded-input border border-line bg-surface-alt px-4 text-[14px] outline-none focus:border-plum" />

      {err ? <p className="mt-6 text-center text-[14px] text-danger">{err}</p>
        : !orders ? <LoadingState label="Loading shop orders…" />
        : !shown.length ? <p className="py-16 text-center text-[14px] text-muted">{tab === 'todo' ? 'Nothing to fulfil right now 🎉' : 'No orders here.'}</p>
        : (
          <div className="mt-4 space-y-3">
            {shown.map((o) => {
              const n = next(o);
              const paid = o.payment_status === 'paid';
              const addr = addressOf(o);
              const phone = (o.customer_phone ?? '').replace(/\D/g, '').slice(-10);
              return (
                <article key={o.id} className="overflow-hidden rounded-[14px] border border-line bg-white">
                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border-[1.5px] px-2.5 py-0.5 text-[11px] font-bold ${paid ? 'border-success text-success' : 'border-amber-500 text-amber-600'}`}>{paid ? 'Paid' : o.payment_status === 'failed' ? 'Payment failed' : 'Not paid'}</span>
                      <span className="rounded-full bg-surface-alt px-2.5 py-0.5 text-[11px] font-semibold text-body">{CHANNEL[o.channel ?? ''] ?? o.channel ?? 'Website'}</span>
                      {isPickup(o) && <span className="rounded-full bg-plum-soft px-2.5 py-0.5 text-[11px] font-bold text-plum">STORE PICKUP</span>}
                      {o.rx_status === 'received' && <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-[11px] font-bold text-danger">Rx to check</span>}
                      {o.rx_status === 'verified' && <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-bold text-success">Rx ✓</span>}
                      {o.rx_status === 'rejected' && <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-[11px] font-bold text-danger">Rx rejected</span>}
                    </div>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[16px] font-bold text-ink">#{o.order_number} · {o.customer_name || 'Customer'}</p>
                        <p className="text-[12px] text-muted">{when(o.paid_at ?? o.created_at)}{!isPickup(o) && o.promised_date && !closed(o) ? ` · run ${day(o.promised_date)}` : ''}</p>
                      </div>
                      <p className="shrink-0 text-[18px] font-bold text-ink">{inr(o.total)}</p>
                    </div>
                    {!isPickup(o) && addr && <p className="mt-1 text-[13px] leading-[1.45] text-body">{addr}</p>}
                    <ul className="mt-2 text-[13px] text-body">
                      {(o.items ?? []).map((i, k) => <li key={k}>• {i.qty} × {i.title}</li>)}
                    </ul>
                    {Number(o.delivery_fee) > 0 && <p className="text-[12px] text-muted">Includes delivery {inr(o.delivery_fee)}</p>}
                    {o.logistics_issue && <p className="mt-1 text-[12px] font-semibold text-danger">Issue: {o.logistics_issue}</p>}
                    <p className="mt-1 text-[12px] font-semibold text-plum">Now: {closed(o) ? (o.delivery_status === 'delivered' ? (isPickup(o) ? 'collected' : 'delivered') : 'cancelled') : String(o.delivery_status ?? 'processing').replace(/_/g, ' ')}</p>

                    {/* Action stack */}
                    {paid && !closed(o) && (
                      <div className="mt-3 space-y-2">
                        {o.prescription_id && (o.rx_status === 'received' || o.rx_status === 'rejected') && (
                          <>
                            <button type="button" onClick={() => openRx(o)} disabled={busy === o.id} className="flex min-h-[46px] w-full items-center justify-center rounded-full border-[1.5px] border-plum text-[14px] font-bold text-plum">View prescription</button>
                            <div className="grid grid-cols-2 gap-2">
                              <button type="button" onClick={() => run(o, 'rx ok')} disabled={busy === o.id} className="min-h-[46px] rounded-full bg-success text-[14px] font-bold text-white">Rx valid ✓</button>
                              <button type="button" onClick={() => { setForm({ o, kind: 'rxbad' }); setFormText(''); }} className="min-h-[46px] rounded-full border-[1.5px] border-danger text-[14px] font-bold text-danger">Reject Rx</button>
                            </div>
                          </>
                        )}
                        {n && (
                          <button type="button" onClick={() => run(o, n.cmd)} disabled={busy === o.id}
                            className="flex min-h-[48px] w-full items-center justify-center rounded-full bg-plum text-[15px] font-bold text-white disabled:opacity-60">
                            {busy === o.id ? 'Updating…' : n.label}
                          </button>
                        )}
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-1 text-[13px] font-semibold">
                          {!isPickup(o) && <button type="button" onClick={() => { setForm({ o, kind: 'eta' }); setFormText('tomorrow'); }} className="text-plum">Set date</button>}
                          {!isPickup(o) && <button type="button" onClick={() => { setForm({ o, kind: 'shipped' }); setFormText(''); }} className="text-plum">Courier link</button>}
                          <button type="button" onClick={() => { setForm({ o, kind: 'issue' }); setFormText(''); }} className="text-plum">Report issue</button>
                          <button type="button" onClick={() => { setForm({ o, kind: 'cancel' }); setFormText(''); }} className="text-danger">Cancel order</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Split action bar: Call | Navigate */}
                  <div className="grid grid-cols-2 border-t border-line">
                    {phone ? <a href={`tel:+91${phone}`} className="flex min-h-[48px] items-center justify-center gap-1 text-[14px] font-bold text-plum">📞 Call</a> : <span />}
                    {!isPickup(o) && addr
                      ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`} target="_blank" rel="noreferrer" className="flex min-h-[48px] items-center justify-center gap-1 bg-plum text-[14px] font-bold text-white">▲ Navigate</a>
                      : phone ? <a href={`https://wa.me/91${phone}?text=${encodeURIComponent(`Hi${o.customer_name ? ' ' + o.customer_name.split(' ')[0] : ''}, this is Mylopaws about your order #${o.order_number}.`)}`} target="_blank" rel="noreferrer" className="flex min-h-[48px] items-center justify-center gap-1 bg-plum text-[14px] font-bold text-white">💬 WhatsApp</a> : <span />}
                  </div>
                </article>
              );
            })}
          </div>
        )}

      <Sheet open={!!rx} onClose={() => setRx(null)} title={rx ? `Prescription · #${rx.o.order_number}` : ''}>
        {rx && (rx.files.length ? (
          <div className="space-y-3 pb-2">
            {rx.files.map((f, i) => f.type.startsWith('image/')
              // eslint-disable-next-line @next/next/no-img-element
              ? <a key={i} href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt={`Prescription page ${i + 1}`} className="w-full rounded-card border border-line" /></a>
              : <a key={i} href={f.url} target="_blank" rel="noreferrer" className="block rounded-card border border-line p-3 text-[14px] font-semibold text-plum">Open page {i + 1} (PDF)</a>)}
            <p className="text-[12px] text-muted">Check the pet’s name, the medicine and the vet’s signature. Links expire in an hour.</p>
          </div>
        ) : <p className="pb-4 text-[14px] text-muted">No file found for this order.</p>)}
      </Sheet>

      <Sheet open={!!form} onClose={() => setForm(null)} title={form ? ({ cancel: 'Cancel order', issue: 'Report an issue', eta: 'Delivery date', rxbad: 'Reject prescription', shipped: 'Shipped by courier' } as const)[form.kind] + ` · #${form.o.order_number}` : ''}>
        {form && (
          <form className="pb-2" onSubmit={(e) => {
            e.preventDefault();
            const t = formText.trim();
            const cmd = form.kind === 'cancel' ? `cancel ${t}` : form.kind === 'issue' ? `issue ${t}` : form.kind === 'eta' ? `eta ${t}` : form.kind === 'rxbad' ? `rx bad ${t}` : `shipped ${t}`;
            if ((form.kind === 'issue' || form.kind === 'eta') && !t) return;
            run(form.o, cmd.trim()); setForm(null);
          }}>
            <p className="mb-2 text-[13px] text-muted">{({
              cancel: 'Reason (the team is alerted to refund and message the customer).',
              issue: 'What went wrong? The team is alerted; the customer is not messaged.',
              eta: 'e.g. tomorrow, 28/10 or 28 Oct. The customer is told the new date.',
              rxbad: 'Reason. The team is alerted to call the customer.',
              shipped: 'Paste the courier tracking link (optional). The customer is told it’s on the way.',
            } as const)[form.kind]}</p>
            <input value={formText} onChange={(e) => setFormText(e.target.value)} autoFocus aria-label="Details"
              className="min-h-[48px] w-full rounded-input border border-line bg-surface-alt px-4 text-[15px] outline-none focus:border-plum" />
            <button type="submit" className={`mt-3 min-h-[50px] w-full rounded-full text-[15px] font-bold text-white ${form.kind === 'cancel' || form.kind === 'rxbad' ? 'bg-danger' : 'bg-plum'}`}>Confirm</button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
