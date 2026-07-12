'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate, { useSession } from '@/components/AuthGate';
import { supabase } from '@/lib/supabase';
import { loadMaps } from '@/lib/maps';
import { payForOrder } from '@/lib/razorpay';
import { STATUS_META } from '@/lib/types';
import { PageShell, PillButton, LoadingState, ErrorState } from '@/components/design';

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
  if (!order) return <PageShell variant="plum" size="compact" title="Booking" onBack={() => router.push('/bookings')}><LoadingState label="Loading booking…" /></PageShell>;

  const stale = loc ? Date.now() - new Date(loc.updated_at).getTime() > 90_000 : false;
  const stepIdx = STEPS.indexOf(order.status);

  return (
    <PageShell variant="plum" size="compact" title={`${type === 'travel' ? '🚗' : '✨'} Booking #${order.id}`}
      onBack={() => router.push('/bookings')} rightAction={badge(order.status)} sheetClassName="pb-10">
      {live && (
        <div className="relative -mt-2 mb-4 h-64 overflow-hidden rounded-card border border-line">
          <div ref={mapDiv} className="h-full w-full" />
          <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold shadow-card">
            {loc ? (stale ? <span className="text-danger">📡 GPS lost — last position</span> : <span className="text-success">🟢 Live</span>) : '⏳ Waiting for partner GPS…'}
          </div>
        </div>
      )}

      {order.status === 'cancelled' && (
        <div className="mb-4 rounded-card border border-danger/30 bg-danger/5 p-4"><p className="font-bold text-danger">Cancelled{order.cancel_reason ? `: ${order.cancel_reason}` : ''}</p></div>
      )}

      <div className="rounded-card border border-line bg-white p-4 shadow-card">
        <p className="mb-3 text-[15px] font-bold text-plum">Status</p>
        {STEPS.map((st, i) => (
          <div key={st} className="mb-2 flex items-center gap-3 last:mb-0">
            <span className={`h-3 w-3 rounded-full ${i <= stepIdx && stepIdx >= 0 ? 'bg-plum' : 'bg-line'}`} />
            <span className={`text-[14px] ${i <= stepIdx ? 'font-bold text-ink' : 'text-muted'}`}>{STATUS_META[st].label}</span>
          </div>
        ))}
      </div>

      {supplier && (
        <div className="mt-3 rounded-card border border-line bg-white p-4 shadow-card">
          <p className="mb-1 text-[13px] font-bold text-plum">Your Mylopaws partner</p>
          <p className="text-[16px] font-bold text-ink">{supplier.name}{supplier.vehicle_type ? ` · ${supplier.vehicle_type}` : ''}</p>
          <a href={`tel:${supplier.phone_number}`} className="mt-3 flex min-h-[52px] items-center justify-center rounded-btn bg-plum text-[15px] font-bold text-white">📞 Call {supplier.name.split(' ')[0]}</a>
        </div>
      )}

      <div className="mt-3 space-y-1.5 rounded-card border border-line bg-white p-4 text-[15px] shadow-card">
        <p className="mb-1 text-[13px] font-bold text-plum">Details</p>
        {type === 'travel' ? (<>
          <p className="text-body">📍 {order.pickup_address}</p><p className="text-body">🏁 {order.drop_address}</p>
          <p className="text-body">🗓 {order.date_of_travel} · {order.time_of_travel}</p><p className="text-body">🐾 {order.furbaby_name}</p>
          {order.fare_estimate && <p className="text-body">💰 Est. fare ₹{order.fare_estimate} (₹{order.booking_fee} booking fee)</p>}
        </>) : (<>
          <p className="text-body">✨ {order.therapy_names}</p><p className="text-body">🏠 {order.address_text}</p>
          <p className="text-body">🗓 {order.date_of_appointment} · {order.time_of_appointment}</p><p className="text-body">🐾 {order.furbaby_name}</p>
          {order.total_amount && <p className="text-body">💰 ₹{order.total_amount}</p>}
        </>)}
        {payment && <p className={`font-semibold ${payment.status === 'paid' ? 'text-success' : payment.status === 'failed' ? 'text-danger' : 'text-muted'}`}>💳 Payment: {payment.status.toUpperCase()}</p>}
      </div>

      {payment && payment.status !== 'paid' && order.status !== 'cancelled' && (
        <div className="mt-4"><PillButton onClick={() => payForOrder(type, Number(id), { email: session?.user.email ?? undefined }).then(load)}>Retry payment</PillButton></div>
      )}
      <a href={`https://wa.me/${type === 'travel' ? '919036608453' : '919148935441'}?text=${encodeURIComponent(`Hi! About my booking #${order.id}`)}`}
        target="_blank" rel="noreferrer"
        className="mt-3 flex min-h-[52px] items-center justify-center rounded-btn border-[1.5px] border-plum text-[15px] font-bold text-plum">
        💬 Chat with us on WhatsApp
      </a>
    </PageShell>
  );
}

export default function Page() { return <AuthGate><Track /></AuthGate>; }
