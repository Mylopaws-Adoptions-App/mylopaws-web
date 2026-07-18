'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStaff } from '@/components/OpsContext';
import { supabase, invokeFn } from '@/lib/supabase';
import { loadMaps } from '@/lib/maps';
import { Badge, Btn, Card, Spinner } from '@/components/ui';
import { NEXT_STATUS, OrderStatus } from '@/lib/types';
import { toast } from '@/lib/toast';
import DermacareJob from '@/components/ops/DermacareJob';

// Dermacare uses the groomer job screen (ops-design skill); Travel keeps the live-tracked trip screen.
export default function Trip() {
  const { type } = useParams<{ type: 'travel' | 'dermacare'; id: string }>();
  if (type === 'dermacare') return <DermacareJob />;
  return <TravelTrip />;
}

// Trip screen: supplier advances status here; while on_the_way/in_progress the browser
// streams GPS via watchPosition (works while this tab stays open — see docs for limits).
function TravelTrip() {
  const { type, id } = useParams<{ type: 'travel' | 'dermacare'; id: string }>();
  const table = type === 'travel' ? 'orders' : 'dermacare_orders';
  const { me } = useStaff();
  const router = useRouter();
  const isSupplier = me?.role === 'supplier';

  const [order, setOrder] = useState<any | null>(null);
  const [loc, setLoc] = useState<any | null>(null);
  const [gpsErr, setGpsErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [calling, setCalling] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapObjs = useRef<{ map?: any; sup?: any; dest?: any }>({});

  const load = useCallback(async () => {
    const { data } = await supabase.from(table).select('*').eq('id', Number(id)).single();
    setOrder(data);
    const { data: l } = await supabase.from('live_locations').select('*').eq('order_type', type).eq('order_id', Number(id)).maybeSingle();
    if (l) setLoc(l);
  }, [table, id, type]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel(`trip-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter: `id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations', filter: `order_id=eq.${id}` }, (p: any) => {
        if (p.new?.order_type === type) setLoc(p.new);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, table, type, load]);

  const live = order && (order.status === 'on_the_way' || order.status === 'in_progress');

  // GPS streaming — supplier only, while live
  useEffect(() => {
    if (!live || !isSupplier || !me) return;
    if (!('geolocation' in navigator)) { setGpsErr('This browser has no GPS support.'); return; }
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        setGpsErr(null);
        const now = Date.now();
        if (now - lastSent.current < 8000) return; // throttle upserts to ~8s
        lastSent.current = now;
        await supabase.from('live_locations').upsert({
          order_type: type, order_id: Number(id), supplier_id: me.id,
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          heading: pos.coords.heading, speed: pos.coords.speed,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'order_type,order_id' });
      },
      (e) => setGpsErr(e.code === 1 ? 'Location permission denied — allow it in the browser to share your position.' : 'GPS unavailable right now.'),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); };
  }, [live, isSupplier, me, type, id]);

  // Map
  useEffect(() => {
    if (!order || !mapDiv.current) return;
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
      }
    });
  }, [order, loc, type]);

  // Masked call: rings the supplier from the Plivo number, then bridges the customer. The
  // customer's real number never reaches this client.
  const callClient = async () => {
    setCalling(true);
    try {
      await invokeFn('plivo-mask-call', { order_type: type, order_id: Number(id) });
      toast('Connecting your call…', 'info');
    } catch (e: any) {
      const m = String(e?.message ?? '');
      toast(m.includes('configured') ? 'Calling isn’t set up yet.' : m.includes('phone') ? 'No phone number on file for this call.' : 'Couldn’t connect the call — please try again.', 'error');
    } finally {
      setCalling(false);
    }
  };

  const advance = async () => {
    const step = NEXT_STATUS[order.status as OrderStatus];
    if (!step) return;
    setBusy(true);
    const { error } = await supabase.from(table).update({ status: step.next }).eq('id', order.id);
    if (!error) invokeFn('send-push', { mode: 'status', order_type: type, order_id: order.id, status: step.next }).catch(() => {});
    setBusy(false);
    if (step.next === 'delivered') router.push(`/ops/board/${type}`);
    load();
  };

  if (!order) return <Spinner />;
  const step = NEXT_STATUS[order.status as OrderStatus];
  const stale = loc ? Date.now() - new Date(loc.updated_at).getTime() > 90_000 : false;

  return (
    <main className="mx-auto max-w-3xl px-5 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-black">Trip #{order.id} · {order.furbaby_name}</h1>
        <Badge status={order.status} />
      </div>

      <div className="relative mt-4 h-80 overflow-hidden rounded-2xl border border-line">
        <div ref={mapDiv} className="h-full w-full" />
        <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1.5 text-xs font-bold shadow">
          {loc ? (stale ? <span className="text-red-600">📡 Stale — {new Date(loc.updated_at).toLocaleTimeString('en-IN')}</span> : <span className="text-green-700">🟢 Live · {new Date(loc.updated_at).toLocaleTimeString('en-IN')}</span>) : '⏳ No GPS yet'}
        </div>
      </div>

      {isSupplier && live && (
        <Card className="mt-4 !border-brass bg-[#FFF9EC]">
          <p className="text-sm font-semibold">📍 Sharing your live location with the pawparent. <b>Keep this tab open</b> during the trip — closing it pauses tracking.</p>
          {gpsErr && <p className="mt-1 text-sm font-semibold text-red-600">{gpsErr}</p>}
        </Card>
      )}

      <Card className="mt-4 space-y-1.5 text-sm">
        {type === 'travel' ? (<>
          <p><a className="text-blue-700 underline" href={order.pickup_maps_link ?? '#'} target="_blank" rel="noreferrer">📍 {order.pickup_address}</a></p>
          <p><a className="text-blue-700 underline" href={order.drop_maps_link ?? '#'} target="_blank" rel="noreferrer">🏁 {order.drop_address}</a></p>
        </>) : (<>
          <p>✨ {order.therapy_names}</p>
          <p><a className="text-blue-700 underline" href={order.address_maps_link ?? '#'} target="_blank" rel="noreferrer">🏠 {order.address_text}</a></p>
        </>)}
        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="font-semibold text-ink">{order.pawparent_name}</span>
          <button onClick={callClient} disabled={calling}
            className="rounded-full bg-plum px-4 py-2 text-[14px] font-bold text-white disabled:opacity-60">
            {calling ? 'Connecting…' : '📞 Call'}
          </button>
        </div>
      </Card>

      {step && (isSupplier || me?.role === 'admin') && (
        <Btn kind="secondary" onClick={advance} loading={busy} className="mt-4 w-full">{step.label}</Btn>
      )}
    </main>
  );
}
