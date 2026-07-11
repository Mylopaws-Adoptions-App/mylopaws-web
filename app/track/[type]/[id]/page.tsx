'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import AuthGate, { useSession } from '@/components/AuthGate';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { loadMaps } from '@/lib/maps';
import { payForOrder } from '@/lib/razorpay';
import { Badge, Btn, Card, Spinner } from '@/components/ui';
import { STATUS_META } from '@/lib/types';

const STEPS = ['unassigned', 'assigned', 'on_the_way', 'in_progress', 'delivered'];

function Track() {
  const { type, id } = useParams<{ type: 'travel' | 'dermacare'; id: string }>();
  const { session } = useSession();
  const table = type === 'travel' ? 'orders' : 'dermacare_orders';
  const [order, setOrder] = useState<any | null>(null);
  const [supplier, setSupplier] = useState<any | null>(null);
  const [loc, setLoc] = useState<any | null>(null);
  const [payment, setPayment] = useState<any | null>(null);
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapObjs = useRef<{ map?: any; sup?: any; dest?: any }>({});

  const load = useCallback(async () => {
    const { data } = await supabase.from(table).select('*').eq('id', Number(id)).single();
    if (!data) return;
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

  if (!order) return <Spinner label="Loading booking…" />;
  const stale = loc ? Date.now() - new Date(loc.updated_at).getTime() > 90_000 : false;
  const stepIdx = STEPS.indexOf(order.status);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-black">{type === 'travel' ? '🚗' : '✨'} Booking #{order.id}</h1>
        <Badge status={order.status} />
      </div>

      {live && (
        <div className="relative mt-4 h-72 overflow-hidden rounded-2xl border border-line">
          <div ref={mapDiv} className="h-full w-full" />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1.5 text-xs font-bold shadow">
            {loc ? (stale ? <span className="text-red-600">📡 GPS signal lost — last position shown</span> : <span className="text-green-700">🟢 Live</span>) : '⏳ Waiting for partner GPS…'}
          </div>
        </div>
      )}

      {order.status === 'cancelled' && (
        <Card className="mt-4 !border-red-300"><p className="font-bold text-red-600">Cancelled{order.cancel_reason ? `: ${order.cancel_reason}` : ''}</p></Card>
      )}

      <Card className="mt-4">
        <p className="mb-2 font-bold text-magenta">Status</p>
        {STEPS.map((st, i) => (
          <div key={st} className="mb-1.5 flex items-center gap-2">
            <span>{i <= stepIdx && stepIdx >= 0 ? '🟣' : '⚪️'}</span>
            <span className={i <= stepIdx ? 'font-bold' : 'text-ink-soft'}>{STATUS_META[st].label}</span>
          </div>
        ))}
      </Card>

      {supplier && (
        <Card className="mt-3">
          <p className="mb-1 font-bold text-magenta">Your Mylopaws partner</p>
          <p className="font-bold">{supplier.name}{supplier.vehicle_type ? ` · ${supplier.vehicle_type}` : ''}</p>
          <a href={`tel:${supplier.phone_number}`} className="mt-3 flex min-h-[48px] items-center justify-center rounded-2xl bg-night font-bold text-white">📞 Call {supplier.name.split(' ')[0]}</a>
        </Card>
      )}

      <Card className="mt-3 space-y-1.5 text-[15px]">
        <p className="font-bold text-magenta">Details</p>
        {type === 'travel' ? (<>
          <p>📍 {order.pickup_address}</p><p>🏁 {order.drop_address}</p>
          <p>🗓 {order.date_of_travel} · {order.time_of_travel}</p><p>🐾 {order.furbaby_name}</p>
          {order.fare_estimate && <p>💰 Est. fare ₹{order.fare_estimate} (₹{order.booking_fee} booking fee)</p>}
        </>) : (<>
          <p>✨ {order.therapy_names}</p><p>🏠 {order.address_text}</p>
          <p>🗓 {order.date_of_appointment} · {order.time_of_appointment}</p><p>🐾 {order.furbaby_name}</p>
          {order.total_amount && <p>💰 ₹{order.total_amount}</p>}
        </>)}
        {payment && <p className={payment.status === 'paid' ? 'text-green-700 font-semibold' : payment.status === 'failed' ? 'text-red-600 font-semibold' : 'text-ink-soft'}>💳 Payment: {payment.status.toUpperCase()}</p>}
      </Card>

      {payment && payment.status !== 'paid' && order.status !== 'cancelled' && (
        <Btn onClick={() => payForOrder(type, Number(id), { email: session?.user.email ?? undefined }).then(load)} className="mt-4 w-full">Retry payment</Btn>
      )}
      <a href={`https://wa.me/${type === 'travel' ? '919036608453' : '919148935441'}?text=${encodeURIComponent(`Hi! About my booking #${order.id}`)}`}
        target="_blank" rel="noreferrer"
        className="mt-3 mb-8 flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-magenta font-bold text-magenta hover:bg-magenta/5">
        💬 Chat with us on WhatsApp
      </a>
    </main>
  );
}
export default function Page() { return <AuthGate><><Nav /><Track /></></AuthGate>; }
