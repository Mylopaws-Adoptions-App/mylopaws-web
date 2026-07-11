'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate, { useSession } from '@/components/AuthGate';
import Nav from '@/components/Nav';
import PlaceInput, { PickedPlace } from '@/components/PlaceInput';
import PetPicker from '@/components/PetPicker';
import { Btn, Card, Chip, Field } from '@/components/ui';
import { supabase, getConfig } from '@/lib/supabase';
import { loadMaps } from '@/lib/maps';
import { payForOrder } from '@/lib/razorpay';
import { Pet, computeFare, mapsLink } from '@/lib/types';

function Travel() {
  const { session } = useSession();
  const router = useRouter();
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);

  const [pickup, setPickup] = useState<PickedPlace | null>(null);
  const [drop, setDrop] = useState<PickedPlace | null>(null);
  const [route, setRoute] = useState<{ km: number; min: number } | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [pet, setPet] = useState<Pet | null>(null);
  const [when, setWhen] = useState<'now' | 'schedule'>('now');
  const [date, setDate] = useState(''); const [time, setTime] = useState('');
  const [phone, setPhone] = useState('');
  const [fareCfg, setFareCfg] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getConfig('fare').then(setFareCfg);
    supabase.from('pets').select('*').eq('customer_id', session!.user.id).then(({ data }) => setPets((data as Pet[]) ?? []));
    supabase.from('customers').select('phone_number').eq('id', session!.user.id).single().then(({ data }) => setPhone(data?.phone_number ?? ''));
    loadMaps().then(g => {
      mapRef.current = new g.maps.Map(mapDiv.current!, {
        center: { lat: 12.9716, lng: 77.5946 }, zoom: 11, disableDefaultUI: true, zoomControl: true,
      });
      rendererRef.current = new g.maps.DirectionsRenderer({ map: mapRef.current, polylineOptions: { strokeColor: '#691A47', strokeWeight: 4 } });
    });
  }, [session]);

  useEffect(() => {
    if (!pickup || !drop) { setRoute(null); return; }
    loadMaps().then(g => {
      new g.maps.DirectionsService().route(
        { origin: { lat: pickup.lat, lng: pickup.lng }, destination: { lat: drop.lat, lng: drop.lng }, travelMode: g.maps.TravelMode.DRIVING },
        (res: any, status: string) => {
          if (status !== 'OK' || !res) { setErr('Could not fetch route — reselect locations.'); return; }
          setErr(null);
          rendererRef.current?.setDirections(res);
          const leg = res.routes[0].legs[0];
          setRoute({ km: leg.distance.value / 1000, min: Math.round(leg.duration.value / 60) });
        });
    });
  }, [pickup, drop]);

  const fare = useMemo(() => (route && fareCfg) ? computeFare(fareCfg, route.km) : null, [route, fareCfg]);
  const bookingFee = Number(fareCfg?.booking_fee ?? 250);
  const canBook = pickup && drop && route && pet && phone.trim().length >= 10 && (when === 'now' || (date && time));

  const book = async () => {
    if (!canBook) return;
    setBusy(true); setErr(null);
    try {
      const { data: cust } = await supabase.from('customers').select('name, email').eq('id', session!.user.id).single();
      const { data: order, error } = await supabase.from('orders').insert({
        customer_id: session!.user.id, pet_id: pet!.id,
        pawparent_name: cust?.name ?? 'Pawparent', furbaby_name: pet!.name, phone_number: phone.trim(),
        pickup_address: pickup!.address, pickup_lat: pickup!.lat, pickup_lng: pickup!.lng,
        drop_address: drop!.address, drop_lat: drop!.lat, drop_lng: drop!.lng,
        pickup_maps_link: mapsLink(pickup!.lat, pickup!.lng), drop_maps_link: mapsLink(drop!.lat, drop!.lng),
        distance_km: Math.round(route!.km * 10) / 10, duration_min: route!.min,
        fare_estimate: fare, booking_fee: bookingFee,
        date_of_travel: when === 'now' ? new Date().toISOString().slice(0, 10) : date,
        time_of_travel: when === 'now' ? new Date().toTimeString().slice(0, 5) : time,
        breed: pet!.breed, aggressive: pet!.aggressive, rescue: pet!.rescue, critical: !!pet!.critical_notes,
      }).select('id').single();
      if (error) throw error;
      await payForOrder('travel', order.id, { name: cust?.name ?? undefined, email: cust?.email ?? undefined, contact: phone.trim() });
      router.push(`/track/travel/${order.id}`);
    } catch (e: any) { setErr(e.message ?? 'Booking failed. Please try again.'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="font-display text-3xl font-black">Book Pet Travel 🚗</h1>
        <Card className="mt-5">
          <PlaceInput label="Pickup 📍" placeholder="Search pickup…" onPicked={setPickup} />
          <PlaceInput label="Drop 🏁" placeholder="Where to?" onPicked={setDrop} />
        </Card>

        <div className="relative mt-4 h-64 overflow-hidden rounded-2xl border border-line">
          <div ref={mapDiv} className="h-full w-full" />
          {route && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1.5 text-sm font-bold shadow-lg">
              {route.km.toFixed(1)} km · ~{route.min} min
            </div>
          )}
        </div>

        <Card className="mt-4">
          <PetPicker pets={pets} selected={pet} onSelect={setPet} onPetAdded={p => setPets(ps => [...ps, p])} userId={session!.user.id} />
        </Card>

        <Card className="mt-4">
          <p className="mb-2 font-bold text-magenta">When?</p>
          <div className="flex flex-wrap">
            <Chip label="🚀 Now" selected={when === 'now'} onClick={() => setWhen('now')} />
            <Chip label="🗓 Schedule" selected={when === 'schedule'} onClick={() => setWhen('schedule')} />
          </div>
          {when === 'schedule' && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
              <Field label="Time" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          )}
          <Field label="Contact number *" value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp number" />
        </Card>

        {fare !== null && (
          <Card className="mt-4 !border-brass bg-[#FFF9EC]">
            <div className="flex justify-between font-bold"><span>Estimated fare</span><span className="text-lg font-black">₹{fare}</span></div>
            <div className="mt-1 flex justify-between text-sm"><span className="text-ink-soft">Booking fee (payable now)</span><span className="font-black text-magenta">₹{bookingFee}</span></div>
            <p className="mt-2 text-xs text-ink-soft">Balance fare is collected after the trip. Estimate may vary with route & waiting time.</p>
          </Card>
        )}

        {err && <p className="mt-3 text-sm font-semibold text-red-600">{err}</p>}
        <Btn onClick={book} disabled={!canBook} loading={busy} className="mt-4 w-full">Pay ₹{bookingFee} & book ride</Btn>
        <p className="my-5 text-center text-xs text-ink-soft">Every ride is pet-first: trained partners, clean vehicles, zero judgment for fur on the seats. 🐾</p>
      </main>
    </>
  );
}
export default function Page() { return <AuthGate><Travel /></AuthGate>; }
