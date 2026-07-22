'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate, { useSession } from '@/components/AuthGate';
import { supabase } from '@/lib/supabase';
import { loadMaps } from '@/lib/maps';
import { payForOrder, confirmPaid, cancelAndRefund } from '@/lib/razorpay';
import { STATUS_META, placeName } from '@/lib/types';
import { PageShell, PillButton, Skeleton, ErrorState, Sheet } from '@/components/design';
import { toast } from '@/lib/toast';
import { track as trackEvent } from '@/lib/analytics';

const STEPS = ['unassigned', 'assigned', 'on_the_way', 'in_progress', 'delivered'];

function Track() {
  const { type, id } = useParams<{ type: 'travel' | 'dermacare'; id: string }>();
  const { session } = useSession();
  const router = useRouter();
  const table = type === 'travel' ? 'orders' : 'dermacare_orders';
  const [order, setOrder] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [supplier, setSupplier] = useState<any | null>(null);
  const [loc, setLoc] = useState<any | null>(null);
  const [payment, setPayment] = useState<any | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [polls, setPolls] = useState(0); // Stage 3: "Confirming payment…" poll counter (2s × 15 ≈ 30s).
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapObjs = useRef<{ map?: any; sup?: any; dest?: any }>({});

  const load = useCallback(async () => {
    const { data } = await supabase.from(table).select('*').eq('id', Number(id)).single();
    if (!data) { setNotFound(true); return; }
    setOrder(data);
    if (data.supplier_assigned) {
      const { data: s } = await supabase.from('staff').select('name, phone_number, vehicle_type').eq('id', data.supplier_assigned).single();
      setSupplier(s);
    }
    const { data: l } = await supabase.from('live_locations').select('*').eq('order_type', type).eq('order_id', Number(id)).maybeSingle();
    if (l) setLoc(l);
    const { data: p } = await supabase.from('payments').select('*').eq('order_type', type).eq('order_id', Number(id)).order('created_at', { ascending: false }).limit(1).maybeSingle();
    setPayment(p);
  }, [id, type, table]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const ch = supabase.channel(`track-${type}-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter: `id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations', filter: `order_id=eq.${id}` }, (p: any) => {
        if (p.new?.order_type === type) setLoc(p.new);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, type, table, load]);

  // Stage 3: right after checkout the payment may still be settling. While an attempt is
  // in-flight ('created') and unconfirmed, poll every 2s up to ~30s so the screen resolves
  // itself to Confirmed or Failed without the customer refreshing.
  useEffect(() => {
    if (!order) return;
    if (order.payment_status === 'paid' || order.status === 'cancelled') return;
    if (payment?.status !== 'created' || polls >= 15) return;
    const t = setTimeout(() => { setPolls(p => p + 1); load(); }, 2000);
    return () => clearTimeout(t);
  }, [order, payment, polls, load]);

  const live = order && (order.status === 'on_the_way' || order.status === 'in_progress');

  useEffect(() => {
    if (!live || !mapDiv.current) return;
    loadMaps().then(g => {
      const dest = type === 'travel'
        ? (order.drop_lat ? { lat: order.drop_lat, lng: order.drop_lng } : null)
        : (order.lat ? { lat: order.lat, lng: order.lng } : null);
      if (!mapObjs.current.map) {
        mapObjs.current.map = new g.maps.Map(mapDiv.current!, {
          center: loc ? { lat: loc.lat, lng: loc.lng } : dest ?? { lat: 12.9716, lng: 77.5946 },
          zoom: 13, disableDefaultUI: true, zoomControl: true,
        });
        if (dest) mapObjs.current.dest = new g.maps.Marker({ map: mapObjs.current.map, position: dest, label: '🏁' });
      }
      if (loc) {
        if (!mapObjs.current.sup) mapObjs.current.sup = new g.maps.Marker({ map: mapObjs.current.map, position: { lat: loc.lat, lng: loc.lng }, label: '🚗' });
        else mapObjs.current.sup.setPosition({ lat: loc.lat, lng: loc.lng });
        mapObjs.current.map.panTo({ lat: loc.lat, lng: loc.lng });
      }
    });
  }, [live, loc, order, type]);

  const badge = (s: string) => {
    const label = STATUS_META[s]?.label ?? s;
    const tone = ['on_the_way', 'in_progress'].includes(s) ? 'bg-mint/50 text-ink'
      : ['delivered', 'cancelled'].includes(s) ? 'bg-surface-alt text-muted' : 'bg-white/20 text-white';
    return <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${tone}`}>{label}</span>;
  };

  if (notFound) return <PageShell variant="plum" size="compact" title="Booking" onBack={() => router.push('/bookings')}><ErrorState title="Booking not found" sub="We couldn’t load this booking." onRetry={() => { setNotFound(false); load(); }} /></PageShell>;
  if (!order) return (
    <PageShell variant="plum" size="compact" title="Booking" onBack={() => router.push('/bookings')}>
      <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading booking…</span>
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-28 w-full rounded-card" />
        <Skeleton className="h-24 w-full rounded-card" />
      </div>
    </PageShell>
  );

  const stale = loc ? Date.now() - new Date(loc.updated_at).getTime() > 90_000 : false;
  const stepIdx = STEPS.indexOf(order.status);
  // An order is only really "booked" once payment is verified server-side (payment_status='paid').
  // Everything else derives from the REAL payment_status — never optimistic text.
  const paid = order.payment_status === 'paid';
  const cancelled = order.status === 'cancelled';
  const payFailed = payment?.status === 'failed';
  // Still settling: an attempt is in-flight and we're inside the poll window.
  const processing = !paid && !cancelled && !payFailed && payment?.status === 'created' && polls < 15;
  // Couldn't confirm: explicit failure, or the poll window elapsed without a 'paid' flip.
  const failed = !paid && !cancelled && !processing;
  const waNumber = type === 'travel' ? '919036608453' : '919148935441';
  // The amount we actually charged (from the verified payment row) — shown only when paid.
  const paidAmount = payment?.amount ?? order.total_amount ?? order.booking_fee;

  const payNow = () => {
    setRetrying(true);
    payForOrder(type, Number(id), { email: session?.user.email ?? undefined })
      .then(o => (o === 'captured' ? confirmPaid(type, Number(id)) : null))
      .then(load)
      .finally(() => setRetrying(false));
  };

  // An admin changed the pickup time on a paid, not-yet-started travel booking → the customer
  // may cancel for an automatic refund. pickup_changed_at is the unlock flag (set server-side).
  const timeChanged = type === 'travel' && !!order.pickup_changed_at && paid && !cancelled
    && ['unassigned', 'assigned'].includes(order.status);
  const refundedAmt = order.refunded_amount ?? payment?.refunded_amount ?? null;

  const doCancel = async () => {
    setCancelling(true);
    try {
      const res = await cancelAndRefund('travel', Number(id));
      trackEvent('booking_cancel_refund', { vertical: 'travel', value: res?.amount, currency: 'INR' });
      setConfirmCancel(false);
      toast(`Booking cancelled — ₹${res?.amount ?? ''} refund initiated.`, 'success');
      load();
    } catch (e: any) {
      toast(e?.message ?? 'Could not cancel — please try again or contact us.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <PageShell variant="plum" size="compact" title={`${type === 'travel' ? '🚗' : '✨'} Booking #${order.id}`}
      onBack={() => router.push('/bookings')} rightAction={badge(order.status)} sheetClassName="pb-10 mp-fade">
      {live && (
        <div className="relative -mt-2 mb-4 h-64 overflow-hidden rounded-card border border-line">
          <div ref={mapDiv} className="h-full w-full" />
          <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold shadow-card">
            {loc ? (stale ? <span className="text-danger">📡 GPS lost — last position</span> : <span className="text-success">🟢 Live</span>) : '⏳ Waiting for partner GPS…'}
          </div>
        </div>
      )}

      {order.status === 'cancelled' && (
        <div className="mb-4 rounded-card border border-danger/30 bg-danger/5 p-4">
          <p className="font-bold text-danger">Cancelled{order.cancel_reason ? `: ${order.cancel_reason}` : ''}</p>
          {refundedAmt != null && <p className="mt-1 text-[13px] font-semibold text-success">₹{refundedAmt} refunded to your original payment method — it typically lands in 3–5 working days.</p>}
        </div>
      )}

      {timeChanged && (
        <div className="mb-4 rounded-card border border-plum/25 bg-plum-soft p-4">
          <p className="text-[15px] font-bold text-plum">Pickup time updated</p>
          <p className="mt-1 text-[13px] leading-[1.5] text-body">
            Our team changed your pickup{order.original_date_of_travel || order.original_time_of_travel ? <> from <span className="font-semibold text-ink">{order.original_date_of_travel ?? order.date_of_travel} · {order.original_time_of_travel ?? order.time_of_travel}</span></> : null} to{' '}
            <span className="font-semibold text-ink">{order.date_of_travel} · {order.time_of_travel}</span>. If this no longer works, you can cancel and we&apos;ll refund your ₹{order.booking_fee} booking fee automatically.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <PillButton variant="secondary" onClick={() => setConfirmCancel(true)}>Cancel &amp; get refund</PillButton>
          </div>
        </div>
      )}

      {paid && (
        <div className="mb-4 rounded-card border border-success/25 bg-success/5 p-5 text-center mp-pop">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success text-[28px] font-bold text-white">✓</div>
          <p className="mt-3 text-[19px] font-extrabold text-ink">Booking confirmed!</p>
          <p className="mt-1 text-[13px] leading-[1.5] text-body">We’ll assign your specialist and confirm the details on WhatsApp.</p>
          <p className="mt-3 inline-block rounded-full bg-white px-4 py-1 text-[13px] font-bold text-success shadow-card">₹{paidAmount} paid</p>
          <button onClick={() => router.push('/bookings')} className="mt-4 min-h-[48px] w-full rounded-btn bg-plum text-[14px] font-bold text-white transition active:scale-[0.98]">View My Bookings</button>
        </div>
      )}

      {processing && (
        <div className="mb-4 flex items-center gap-3 rounded-card bg-butter p-4" role="status" aria-live="polite">
          <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-plum/30 border-t-plum" />
          <div>
            <p className="text-[15px] font-bold text-ink">Confirming your payment…</p>
            <p className="mt-0.5 text-[13px] leading-[1.5] text-body">This usually takes a few seconds. Please don’t close this screen.</p>
          </div>
        </div>
      )}

      {failed && (
        <div className="mb-4 rounded-card border border-danger/25 bg-danger/5 p-4">
          <p className="text-[15px] font-bold text-ink">{payFailed ? 'Payment didn’t go through' : 'Payment incomplete'}</p>
          <p className="mt-1 text-[13px] leading-[1.5] text-body">
            {payFailed
              ? 'Your payment didn’t complete, so this booking isn’t confirmed. You can try again — you won’t be charged twice if an earlier attempt already went through.'
              : 'This booking isn’t confirmed yet. Complete the payment to lock it in — you won’t be charged twice if a previous attempt already went through.'}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <PillButton loading={retrying} onClick={payNow}>{payFailed ? 'Retry payment' : 'Complete payment'}</PillButton>
            <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi! I had trouble paying for booking #${order.id}`)}`}
              target="_blank" rel="noreferrer"
              className="flex min-h-[48px] items-center justify-center rounded-btn border-[1.5px] border-plum text-[14px] font-bold text-plum transition active:scale-[0.98]">💬 Get help on WhatsApp</a>
          </div>
        </div>
      )}

      {paid && (
        <div className="rounded-card border border-line bg-white p-4 shadow-card">
          <p className="mb-3 text-[15px] font-bold text-plum">Status</p>
          {STEPS.map((st, i) => (
            <div key={st} className="mb-2 flex items-center gap-3 last:mb-0">
              <span className={`h-3 w-3 rounded-full ${i <= stepIdx && stepIdx >= 0 ? 'bg-plum' : 'bg-line'}`} />
              <span className={`text-[14px] ${i <= stepIdx ? 'font-bold text-ink' : 'text-muted'}`}>{STATUS_META[st].label}</span>
            </div>
          ))}
        </div>
      )}

      {supplier && (
        <div className="mt-3 rounded-card border border-line bg-white p-4 shadow-card">
          <p className="mb-1 text-[13px] font-bold text-plum">Your Mylopaws partner</p>
          <p className="text-[16px] font-bold text-ink">{supplier.name}{supplier.vehicle_type ? ` · ${supplier.vehicle_type}` : ''}</p>
          <a href={`tel:${supplier.phone_number}`} className="mt-3 flex min-h-[52px] items-center justify-center rounded-btn bg-plum text-[15px] font-bold text-white transition active:scale-[0.98]">📞 Call {supplier.name.split(' ')[0]}</a>
        </div>
      )}

      <div className="mt-3 space-y-1.5 rounded-card border border-line bg-white p-4 text-[15px] shadow-card">
        <p className="mb-1 text-[13px] font-bold text-plum">Details</p>
        {type === 'travel' ? (<>
          <p className="text-body">📍 {placeName(order.pickup_name, order.pickup_address)}</p><p className="text-body">🏁 {placeName(order.drop_name, order.drop_address)}</p>
          <p className="text-body">🗓 {order.date_of_travel} · {order.time_of_travel}</p><p className="text-body">🐾 {order.furbaby_name}</p>
          {order.fare_estimate && <p className="text-body">💰 Est. fare ₹{order.fare_estimate} (₹{order.booking_fee} booking fee)</p>}
        </>) : (<>
          <p className="text-body">✨ {order.therapy_names}</p><p className="text-body">🏠 {placeName(order.address_name, order.address_text)}</p>
          <p className="text-body">🗓 {order.date_of_appointment} · {order.time_of_appointment}</p><p className="text-body">🐾 {order.furbaby_name}</p>
          {order.total_amount && <p className="text-body">💰 ₹{order.total_amount}</p>}
        </>)}
        {payment && <p className={`font-semibold ${payment.status === 'paid' ? 'text-success' : payment.status === 'failed' ? 'text-danger' : 'text-muted'}`}>💳 Payment: {payment.status.toUpperCase()}</p>}
      </div>

      <a href={`https://wa.me/${type === 'travel' ? '919036608453' : '919148935441'}?text=${encodeURIComponent(`Hi! About my booking #${order.id}`)}`}
        target="_blank" rel="noreferrer"
        className="mt-3 flex min-h-[52px] items-center justify-center rounded-btn border-[1.5px] border-plum text-[15px] font-bold text-plum transition active:scale-[0.98]">
        💬 Chat with us on WhatsApp
      </a>

      <Sheet open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel this booking?">
        <p className="mb-4 text-[14px] leading-[1.5] text-body">
          We&apos;ll cancel booking #{order.id} and refund your ₹{order.booking_fee} booking fee to your original payment method (typically 3–5 working days). This can&apos;t be undone.
        </p>
        <PillButton loading={cancelling} onClick={doCancel}>Cancel &amp; refund ₹{order.booking_fee}</PillButton>
        <button onClick={() => setConfirmCancel(false)} className="mt-2 w-full py-3 text-[15px] font-semibold text-muted">Keep my booking</button>
      </Sheet>
    </PageShell>
  );
}

export default function Page() { return <AuthGate><Track /></AuthGate>; }
