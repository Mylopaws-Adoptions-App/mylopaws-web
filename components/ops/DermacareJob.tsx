'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStaff } from '@/components/OpsContext';
import { supabase, invokeFn } from '@/lib/supabase';
import { aggressionMeta, fmtApptDateTime, navUrl, rupees } from '@/lib/types';
import { toast } from '@/lib/toast';
import { Sheet, Field, LoadingState, ErrorState, Icons, Portal } from '@/components/design';

type Row = any;
const push = (order_id: number, status: string) => invokeFn('send-push', { mode: 'status', order_type: 'dermacare', order_id, status }).catch(() => {});

export default function DermacareJob() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { me } = useStaff();
  const isAdmin = me?.role === 'admin';

  const [order, setOrder] = useState<Row | null>(null);
  const [items, setItems] = useState<Row[]>([]);
  const [pet, setPet] = useState<Row | null>(null);
  const [payment, setPayment] = useState<Row | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [calling, setCalling] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [collectOpen, setCollectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('dermacare_orders').select('*').eq('id', Number(id)).maybeSingle();
    if (!data) { setNotFound(true); return; }
    setOrder(data);
    const { data: its } = await supabase.from('dermacare_order_items')
      .select('price_at_booking, service_id, addon_id, services(name, description, includes), addons(name)')
      .eq('order_id', Number(id));
    setItems((its as Row[]) ?? []);
    if (data.pet_id) {
      const { data: p } = await supabase.from('pets').select('name, breed, age_years, aggression_level').eq('id', data.pet_id).maybeSingle();
      setPet(p);
    }
    const { data: pay } = await supabase.from('payments').select('*').eq('order_type', 'dermacare').eq('order_id', Number(id)).order('created_at', { ascending: false }).limit(1).maybeSingle();
    setPayment(pay);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const ch = supabase.channel(`derma-job-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dermacare_orders', filter: `id=eq.${id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, load]);

  if (notFound) return <Shell onBack={() => router.push('/ops/board/dermacare')}><ErrorState title="Booking not found" sub="This job may have been removed." onRetry={() => { setNotFound(false); load(); }} /></Shell>;
  if (!order) return <Shell onBack={() => router.push('/ops/board/dermacare')}><LoadingState label="Loading job…" /></Shell>;

  const petsCount = Number(order.pets_count ?? 1);
  const serviceItem = items.find(i => i.service_id);
  const addonItems = items.filter(i => i.addon_id);
  const serviceName = serviceItem?.services?.name ?? order.therapy_names ?? 'Service';
  const serviceDesc = serviceItem?.services?.description ?? null;
  const includes: string[] = serviceItem?.services?.includes ?? [];
  const servicePrice = Number(serviceItem?.price_at_booking ?? 0);
  const serviceAmount = servicePrice * petsCount;
  const addonsTotal = addonItems.reduce((s, a) => s + Number(a.price_at_booking), 0);
  const total = (serviceItem ? serviceAmount + addonsTotal : Number(order.total_amount ?? 0));

  const isCod = order.payment_mode === 'cod';
  // Online is pay-and-book: an order only reaches this board once payment_status='paid', so treat
  // it as paid for the completion gate even if the payments-row lookup is momentarily stale.
  const paid = isCod ? !!order.collected_at : (payment?.status === 'paid' || order.payment_status === 'paid');
  const agg = aggressionMeta(pet?.aggression_level);

  const setStatus = async (status: string) => {
    setBusy(true); setErr(null);
    const { error } = await supabase.from('dermacare_orders').update({ status }).eq('id', order.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    push(order.id, status);
    if (status === 'delivered' || status === 'cancelled') { router.push('/ops/board/dermacare'); return; }
    load();
  };

  const collect = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.from('dermacare_orders')
      .update({ amount_collected: total, collected_at: new Date().toISOString(), collected_by: me?.id ?? null }).eq('id', order.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setCollectOpen(false); load();
  };

  // Masked call: rings the supplier from the Plivo number, then bridges the customer. The
  // customer's real number never reaches this client.
  const callClient = async () => {
    setCalling(true);
    try {
      await invokeFn('plivo-mask-call', { order_type: 'dermacare', order_id: order.id });
      toast('Connecting your call…', 'info');
    } catch (e: any) {
      const m = String(e?.message ?? '');
      toast(m.includes('configured') ? 'Calling isn’t set up yet.' : m.includes('phone') ? 'No phone number on file for this call.' : 'Couldn’t connect the call — please try again.', 'error');
    } finally {
      setCalling(false);
    }
  };

  const setPaymentMode = async (mode: 'online' | 'cod') => {
    setBusy(true);
    await supabase.from('dermacare_orders').update({ payment_mode: mode }).eq('id', order.id);
    setBusy(false); load();
  };

  const active = !['delivered', 'cancelled'].includes(order.status);
  const badge = paid
    ? <span className="rounded-full border-[1.5px] border-success px-3 py-1 text-[13px] font-bold text-success">Paid</span>
    : <span className="rounded-full border-[1.5px] border-amber-500 px-3 py-1 text-[13px] font-bold text-amber-600">{isCod ? 'Cash On Delivery' : 'Payment Pending'}</span>;

  return (
    <Shell onBack={() => router.push('/ops/board/dermacare')} sticky={
      <div className="grid grid-cols-2">
        <button onClick={callClient} disabled={calling} className="flex min-h-[56px] items-center justify-center border-r border-line text-[15px] font-bold text-plum disabled:opacity-60">{calling ? 'Connecting…' : 'Call Client'}</button>
        <a href={navUrl(order.lat, order.lng, order.address_text)} target="_blank" rel="noreferrer" className="flex min-h-[56px] items-center justify-center bg-plum text-[15px] font-bold text-white">Navigate</a>
      </div>
    }>
      {badge}
      {isAdmin && active && (
        <button onClick={() => setPaymentMode(isCod ? 'online' : 'cod')} disabled={busy}
          className="ml-3 align-middle text-[12px] font-semibold text-muted underline">
          {isCod ? 'Mark as prepaid (online)' : 'Mark as Cash on Delivery'}
        </button>
      )}

      <p className="mt-4 text-[15px] font-semibold text-ink">{fmtApptDateTime(order.date_of_appointment, order.time_of_appointment)}</p>
      <p className="mt-1 text-[15px] text-body"><span className="font-semibold text-ink">Client:</span> {order.pawparent_name}</p>
      <p className="mt-2 text-[15px] leading-[1.5] text-body">{order.address_text}</p>

      <div className="my-5 h-px bg-line" />

      <h2 className="text-[20px] font-bold text-ink">Package Summary</h2>
      <div className="mt-3 rounded-card border border-line p-4">
        <h3 className="text-[17px] font-bold text-ink">{serviceName}</h3>
        {serviceDesc && <p className="mt-0.5 text-[14px] text-muted">{serviceDesc}</p>}
        <p className="mt-2 text-[22px] font-bold text-ink">{rupees(servicePrice)}</p>

        {includes.length > 0 && (
          <div className="mt-3">
            <p className="text-[13px] font-bold text-ink">Included</p>
            <p className="mt-0.5 text-[13px] leading-[1.5] text-muted">{includes.join(', ')}.</p>
          </div>
        )}

        {addonItems.length > 0 && (
          <div className="mt-3">
            <p className="text-[13px] font-bold text-ink">Add-ons</p>
            <div className="mt-1 space-y-1">
              {addonItems.map((a, i) => (
                <div key={i} className="flex justify-between text-[13px]"><span className="text-body">{a.addons?.name ?? 'Add-on'}</span><span className="text-ink">{rupees(a.price_at_booking)}</span></div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-[13px]">
          <span><span className="font-bold text-ink">Breed:</span> <span className="text-muted">{pet?.breed ?? order.breed ?? '—'}</span></span>
          <span className="text-line">|</span>
          <span><span className="font-bold text-ink">Age:</span> <span className="text-muted">{pet?.age_years != null ? `${pet.age_years} yr${pet.age_years === 1 ? '' : 's'}` : '—'}</span></span>
          <span className="text-line">|</span>
          <span><span className="font-bold text-ink">Aggression:</span> <span className={agg.text}>{Number(pet?.aggression_level ?? 0)} · {agg.label}</span></span>
        </div>
        {petsCount > 1 && <p className="mt-2 text-[12px] text-muted">+{petsCount - 1} more pet{petsCount - 1 === 1 ? '' : 's'} on this booking.</p>}
      </div>

      <div className="mt-5 rounded-card border border-line p-4">
        <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded bg-ink text-[12px] text-white">₹</span><h3 className="text-[16px] font-bold text-ink">Payment Summary</h3></div>
        <div className="flex justify-between text-[14px]"><span className="text-body">{serviceName}{petsCount > 1 ? ` × ${petsCount}` : ''}</span><span className="font-semibold text-ink">{rupees(serviceAmount)}</span></div>
        {addonItems.map((a, i) => (
          <div key={i} className="mt-1 flex justify-between text-[14px]"><span className="text-body">{a.addons?.name ?? 'Add-on'}</span><span className="text-ink">{rupees(a.price_at_booking)}</span></div>
        ))}
        <div className="my-3 h-px bg-line" />
        <div className="flex justify-between text-[15px] font-bold"><span className="text-ink">Total Amount:</span><span className="text-plum">{rupees(total)}</span></div>
      </div>

      {/* Action stack */}
      <div className="mt-5 space-y-3">
        {order.status === 'assigned' && (
          <button onClick={() => setStatus('in_progress')} disabled={busy}
            className="relative flex min-h-[54px] w-full items-center justify-center rounded-btn border-[1.5px] border-plum text-[15px] font-bold text-plum">
            <span className="absolute left-2 flex h-9 w-9 items-center justify-center rounded-full bg-plum-soft text-[16px] text-plum">»</span>
            Start Booking
          </button>
        )}
        {order.status === 'in_progress' && !paid && isCod && (
          <button onClick={() => setCollectOpen(true)} disabled={busy}
            className="flex min-h-[54px] w-full items-center justify-center rounded-btn bg-plum text-[15px] font-bold text-white">Collect Payment</button>
        )}
        {order.status === 'in_progress' && !paid && !isCod && (
          <p className="rounded-xl bg-amber-50 p-3 text-center text-[13px] font-medium text-amber-700">Online payment pending — resolve before completing.</p>
        )}
        {order.status === 'in_progress' && paid && (
          <button onClick={() => setStatus('delivered')} disabled={busy}
            className="flex min-h-[54px] w-full items-center justify-center rounded-btn bg-plum text-[15px] font-bold text-white">Mark Completed</button>
        )}
        {err && <p className="text-center text-[13px] font-medium text-danger">{err}</p>}
        {isAdmin && active && (
          <button onClick={() => setCancelOpen(true)} className="w-full py-2 text-center text-[14px] font-bold text-danger">Cancel Booking</button>
        )}
      </div>

      <Sheet open={collectOpen} onClose={() => setCollectOpen(false)} title="Collect payment">
        <p className="text-[15px] text-body">Collect <span className="font-bold text-ink">{rupees(total)}</span> in cash from <span className="font-bold text-ink">{order.pawparent_name}</span>?</p>
        <button onClick={collect} disabled={busy} className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-btn bg-plum text-[15px] font-bold text-white">Confirm — collected {rupees(total)}</button>
        <button onClick={() => setCollectOpen(false)} className="mt-2 w-full py-3 text-[15px] font-semibold text-muted">Cancel</button>
      </Sheet>

      <Sheet open={cancelOpen} onClose={() => { setCancelOpen(false); setReason(''); }} title={`Cancel booking #${order.id}`}>
        <Field label="Reason (required — audit-logged)" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Customer no-show" />
        <button
          className="flex min-h-[52px] w-full items-center justify-center rounded-btn bg-danger text-[15px] font-bold text-white"
          onClick={async () => {
            if (!reason.trim()) { setErr('A cancellation reason is required.'); return; }
            setBusy(true);
            const { error } = await supabase.from('dermacare_orders').update({ status: 'cancelled', cancel_reason: reason.trim() }).eq('id', order.id);
            setBusy(false);
            if (error) { setErr(error.message); return; }
            push(order.id, 'cancelled');
            router.push('/ops/board/dermacare');
          }}>Cancel booking</button>
        <button onClick={() => { setCancelOpen(false); setReason(''); }} className="mt-2 w-full py-3 text-[15px] font-semibold text-muted">Keep booking</button>
      </Sheet>
    </Shell>
  );
}

// White mobile shell with a "Booking Detail" header + a sticky bottom action bar.
function Shell({ children, onBack, sticky }: { children: React.ReactNode; onBack: () => void; sticky?: React.ReactNode }) {
  return (
    <div className="relative mx-auto min-h-screen max-w-[480px] bg-white">
      <header className="flex items-center gap-2 px-5 pb-2 pt-5">
        <button onClick={onBack} aria-label="Back" className="-ml-1 flex h-11 w-11 items-center justify-center text-ink"><Icons.ChevronLeft className="h-6 w-6" /></button>
        <h1 className="text-[20px] font-bold text-ink">Booking Detail</h1>
      </header>
      <main className={`px-5 pt-3 ${sticky ? 'pb-28' : 'pb-10'}`}>{children}</main>
      {/* Sticky Call/Navigate bar sits directly ABOVE the persistent ops bottom nav (56px+safe).
          Portaled to body so it escapes the animated `.mp-page` ancestor and never scrolls away. */}
      {sticky && (
        <Portal>
          <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom))] left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-white">{sticky}</div>
        </Portal>
      )}
    </div>
  );
}
