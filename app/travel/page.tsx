'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate, { useSession } from '@/components/AuthGate';
import PlaceInput, { PickedPlace } from '@/components/PlaceInput';
import PetPicker from '@/components/PetPicker';
import {
  PageShell, PillButton, ModePillRow, DateTile, TimeSlot,
  PickupDropInput, RecapPill, ButterCallout, Sheet, Field, Icons,
} from '@/components/design';
import { supabase, getConfig } from '@/lib/supabase';
import { loadMaps, getMapsAuthError, MapsKeyMissingError } from '@/lib/maps';
import { payForOrder } from '@/lib/razorpay';
import { Pet, computeFare, mapsLink } from '@/lib/types';

const MODES = ['Intracity', 'Out Station', 'Train', 'Airline'];
const DAY_ABBR = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MON_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ordinal = (n: number) => (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
const to12 = (h: number, m: number) => `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;

function prettyDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return `${DAY_ABBR[d.getDay()][0] + DAY_ABBR[d.getDay()].slice(1).toLowerCase()}, ${d.getDate()}${ordinal(d.getDate())} ${MON_ABBR[d.getMonth()]}`;
}

type Step = 1 | 2 | 3 | 4;

function Travel() {
  const { session } = useSession();
  const router = useRouter();
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const dirResult = useRef<any>(null);

  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState('Intracity');
  const [dateISO, setDateISO] = useState('');
  const [time, setTime] = useState(''); // HH:MM (24h) for backend
  const [pickup, setPickup] = useState<PickedPlace | null>(null);
  const [drop, setDrop] = useState<PickedPlace | null>(null);
  const [searchFor, setSearchFor] = useState<'pickup' | 'drop' | null>(null);
  const [route, setRoute] = useState<{ km: number; min: number } | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [pet, setPet] = useState<Pet | null>(null);
  const [phone, setPhone] = useState('');
  const [fareCfg, setFareCfg] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mapErr, setMapErr] = useState<string | null>(null);
  const [done, setDone] = useState<null | { id: number; total: number; paid: number; balance: number; date: string; time: string }>(null);

  const describeMapsError = (e: unknown) =>
    e instanceof MapsKeyMissingError ? 'Map unavailable — NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set.' : `Map unavailable — ${(e as Error)?.message ?? 'failed to load'}`;

  // Load fare config, pets, saved phone (unchanged queries).
  useEffect(() => {
    getConfig('fare').then(setFareCfg);
    supabase.from('pets').select('*').eq('customer_id', session!.user.id).then(({ data }) => setPets((data as Pet[]) ?? []));
    supabase.from('customers').select('phone_number').eq('id', session!.user.id).single().then(({ data }) => setPhone(data?.phone_number ?? ''));
  }, [session]);

  // Route (km/min) via Google Directions — same service as before.
  useEffect(() => {
    if (!pickup || !drop) { setRoute(null); dirResult.current = null; return; }
    loadMaps().then(g => {
      setMapErr(null);
      new g.maps.DirectionsService().route(
        { origin: { lat: pickup.lat, lng: pickup.lng }, destination: { lat: drop.lat, lng: drop.lng }, travelMode: g.maps.TravelMode.DRIVING },
        (res: any, status: string) => {
          if (status !== 'OK' || !res) {
            const authErr = getMapsAuthError();
            setErr(authErr ?? `Could not fetch route (${status}) — reselect locations.`);
            return;
          }
          setErr(null);
          dirResult.current = res;
          rendererRef.current?.setDirections(res);
          const leg = res.routes[0].legs[0];
          setRoute({ km: leg.distance.value / 1000, min: Math.round(leg.duration.value / 60) });
        });
    }).catch(e => { const m = describeMapsError(e); setMapErr(m); setErr(m); });
  }, [pickup, drop]);

  // Init the ride map only when its screen is visible.
  useEffect(() => {
    if (step !== 3 || !mapDiv.current || mapRef.current) return;
    loadMaps().then(g => {
      setMapErr(null);
      mapRef.current = new g.maps.Map(mapDiv.current!, { center: { lat: 12.9716, lng: 77.5946 }, zoom: 11, disableDefaultUI: true, zoomControl: true });
      rendererRef.current = new g.maps.DirectionsRenderer({ map: mapRef.current, polylineOptions: { strokeColor: '#6B1A47', strokeWeight: 4 } });
      if (dirResult.current) rendererRef.current.setDirections(dirResult.current);
      // gm_authFailure fires slightly after the SDK loads; re-check for an auth/referrer/billing error.
      setTimeout(() => { const a = getMapsAuthError(); if (a) setMapErr(a); }, 1500);
    }).catch(e => setMapErr(describeMapsError(e)));
  }, [step]);

  const days = useMemo(() => Array.from({ length: 10 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; }), []);
  const slots = useMemo(() => {
    if (!dateISO) return [];
    const now = new Date();
    const isToday = dateISO === isoOf(now);
    const out: { hhmm: string; label: string }[] = [];
    for (let h = 6; h <= 21; h++) for (const m of [0, 30]) {
      const d = new Date(dateISO + 'T00:00:00'); d.setHours(h, m, 0, 0);
      if (isToday && d.getTime() < now.getTime() + 30 * 60000) continue;
      out.push({ hhmm: `${pad(h)}:${pad(m)}`, label: to12(h, m) });
    }
    return out;
  }, [dateISO]);

  const fare = useMemo(() => (route && fareCfg) ? computeFare(fareCfg, route.km) : null, [route, fareCfg]);
  const bookingFee = Number(fareCfg?.booking_fee ?? 250);
  const balance = fare != null ? Math.max(0, fare - bookingFee) : 0;

  const recap = dateISO && time ? `${prettyDate(dateISO)}  |  ${to12(Number(time.slice(0, 2)), Number(time.slice(3)))}` : '';
  const step2Ready = !!(pickup && drop && route && pet && phone.trim().length >= 10);

  const book = async () => {
    if (!route || fare == null || !pickup || !drop || !pet) return;
    setBusy(true); setErr(null);
    try {
      const { data: cust } = await supabase.from('customers').select('name, email').eq('id', session!.user.id).single();
      const { data: order, error } = await supabase.from('orders').insert({
        customer_id: session!.user.id, pet_id: pet.id,
        pawparent_name: cust?.name ?? 'Pawparent', furbaby_name: pet.name, phone_number: phone.trim(),
        pickup_address: pickup.address, pickup_lat: pickup.lat, pickup_lng: pickup.lng,
        drop_address: drop.address, drop_lat: drop.lat, drop_lng: drop.lng,
        pickup_maps_link: mapsLink(pickup.lat, pickup.lng), drop_maps_link: mapsLink(drop.lat, drop.lng),
        distance_km: Math.round(route.km * 10) / 10, duration_min: route.min,
        fare_estimate: fare, booking_fee: bookingFee,
        date_of_travel: dateISO, time_of_travel: time,
        breed: pet.breed, aggressive: pet.aggressive, rescue: pet.rescue, critical: !!pet.critical_notes,
      }).select('id').single();
      if (error) throw error;
      const paid = await payForOrder('travel', order.id, { name: cust?.name ?? undefined, email: cust?.email ?? undefined, contact: phone.trim() });
      if (paid) {
        setDone({ id: order.id, total: fare, paid: bookingFee, balance, date: prettyDate(dateISO), time: to12(Number(time.slice(0, 2)), Number(time.slice(3))) });
      } else {
        setErr('Payment not completed. Tap “Pay Booking Amount” to try again.');
      }
    } catch (e: any) { setErr(e.message ?? 'Booking failed. Please try again.'); }
    finally { setBusy(false); }
  };

  // ── Success screen (screen 16) ───────────────────────────────────────────
  if (done) {
    return (
      <div className="relative mx-auto flex min-h-screen max-w-[480px] flex-col bg-white px-5 pb-10 pt-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/')} aria-label="Home" className="-ml-1 flex h-11 w-11 items-center justify-center text-ink"><Icons.ChevronLeft className="h-6 w-6" /></button>
        </div>
        <div className="relative mx-auto mt-8 flex h-40 w-40 items-center justify-center">
          <span className="absolute left-2 top-6 h-2 w-2 rounded-full bg-mint" />
          <span className="absolute right-3 top-3 text-plum">+</span>
          <span className="absolute right-0 top-16 h-2 w-2 rounded-full bg-mint" />
          <span className="absolute left-6 top-0 text-ink">+</span>
          <span className="absolute bottom-2 left-10 text-plum">+</span>
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-success/15">
            <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-success text-white"><Icons.Check className="h-8 w-8" /></span>
          </span>
        </div>
        <h1 className="mt-6 text-center text-[22px] font-bold text-ink">Your ride has been successfully booked</h1>
        <p className="mt-3 text-center text-[14px] text-muted">{done.date}  |  {done.time}</p>
        <p className="mt-1 text-center text-[14px] text-muted">Order #{done.id}</p>

        <div className="mt-9 space-y-3">
          <div className="flex justify-between text-[13px]"><span className="font-semibold uppercase tracking-wide text-muted">Total amount</span><span className="font-bold text-ink">₹{done.total}</span></div>
          <div className="flex justify-between text-[13px]"><span className="font-semibold uppercase tracking-wide text-muted">Amount paid</span><span className="font-bold text-ink">₹{done.paid}</span></div>
          <div className="flex justify-between text-[13px]"><span className="font-semibold uppercase tracking-wide text-muted">Amount to be paid</span><span className="font-bold text-success">₹{done.balance}</span></div>
        </div>

        <div className="mt-auto space-y-3 pt-10">
          <PillButton onClick={() => router.push(`/track/travel/${done.id}`)}>Track your ride</PillButton>
          <button onClick={() => router.push('/')} className="w-full py-2 text-[15px] font-semibold text-muted">Go home</button>
        </div>
      </div>
    );
  }

  const onBack = () => (step === 1 ? router.push('/') : setStep((step - 1) as Step));
  const pills = <ModePillRow options={MODES} value={mode} onChange={setMode} />;

  // Non-Intracity modes aren't live yet — honest "coming soon" instead of a dead flow.
  if (mode !== 'Intracity') {
    return (
      <PageShell variant="mint" size="compact" title="Travel" onBack={onBack} pills={pills}>
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="text-5xl">🚧</div>
          <h3 className="mt-3 text-[20px] font-bold text-ink">{mode} — coming soon</h3>
          <p className="mt-1 max-w-xs text-[14px] leading-[1.5] text-muted">We currently serve Intracity rides in Bengaluru. {mode} bookings are on the way.</p>
          <div className="mt-6 w-full max-w-[240px]"><PillButton variant="secondary" onClick={() => setMode('Intracity')}>Back to Intracity</PillButton></div>
        </div>
      </PageShell>
    );
  }

  // ── Step 1: date & time ──────────────────────────────────────────────────
  if (step === 1) {
    return (
      <PageShell variant="mint" size="compact" title="Travel" onBack={onBack} pills={pills}
        footer={<PillButton disabled={!(dateISO && time)} onClick={() => setStep(2)}>Next</PillButton>}>
        <h2 className="text-[20px] font-bold text-ink">Select Date</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {days.map(d => {
            const iso = isoOf(d);
            return <DateTile key={iso} day={DAY_ABBR[d.getDay()]} date={pad(d.getDate())} selected={dateISO === iso}
              onClick={() => { setDateISO(iso); setTime(''); }} />;
          })}
        </div>

        <h2 className="mt-8 text-[20px] font-bold text-ink">Select Time</h2>
        {!dateISO ? (
          <p className="mt-3 text-[14px] text-muted">Pick a date first to see available times.</p>
        ) : slots.length === 0 ? (
          <p className="mt-3 text-[14px] text-muted">No more slots today — please choose another date.</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-3">
            {slots.map(s => <TimeSlot key={s.hhmm} label={s.label} selected={time === s.hhmm} onClick={() => setTime(s.hhmm)} />)}
          </div>
        )}
      </PageShell>
    );
  }

  // ── Step 2: pickup / drop (+ pet + contact) ──────────────────────────────
  if (step === 2) {
    return (
      <PageShell variant="mint" size="compact" title="Travel" onBack={onBack} pills={pills}
        footer={<PillButton disabled={!step2Ready} loading={busy} onClick={() => setStep(3)}>{route || !(pickup && drop) ? 'Next' : 'Calculating route…'}</PillButton>}>
        <div className="mb-5"><RecapPill text={recap} onClick={() => setStep(1)} /></div>

        <PickupDropInput
          pickup={pickup?.address}
          drop={drop?.address}
          onPickupClick={() => setSearchFor('pickup')}
          onDropClick={() => setSearchFor('drop')}
        />

        <h2 className="mt-7 text-[17px] font-bold text-ink">Who&apos;s travelling?</h2>
        <div className="mt-3">
          <PetPicker pets={pets} selected={pet} onSelect={setPet} onPetAdded={p => setPets(ps => [...ps, p])} userId={session!.user.id} />
        </div>

        <h2 className="mt-7 text-[17px] font-bold text-ink">Contact number</h2>
        <div className="mt-3"><Field value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp number" inputMode="tel" /></div>

        {err && <p className="mt-2 text-[13px] font-medium text-danger">{err}</p>}

        <Sheet open={searchFor !== null} onClose={() => setSearchFor(null)} title={searchFor === 'pickup' ? 'Set pickup' : 'Set drop'}>
          <PlaceInput bare autoFocus placeholder={searchFor === 'pickup' ? 'Search pickup…' : 'Where to?'}
            onPicked={p => { searchFor === 'pickup' ? setPickup(p) : setDrop(p); setSearchFor(null); }} />
          <p className="mt-3 text-[12px] text-muted">Start typing an address, then pick from the suggestions.</p>
        </Sheet>
      </PageShell>
    );
  }

  // ── Step 3: choose a ride ────────────────────────────────────────────────
  if (step === 3) {
    return (
      <PageShell variant="mint" size="compact" title="Travel" onBack={onBack} pills={pills}
        sheetClassName="!px-0"
        footer={<PillButton disabled={fare == null} onClick={() => setStep(4)}>Select</PillButton>}>
        <div className="relative -mt-3 mb-1 h-52 w-full overflow-hidden border-y border-line">
          <div ref={mapDiv} className="h-full w-full" />
          {mapErr && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-surface-alt px-6 text-center">
              <span className="text-2xl">🗺️</span>
              <p className="text-[13px] font-semibold text-danger">{mapErr}</p>
              <p className="text-[12px] text-muted">Check the browser console for the exact Google Maps error, and see MAPS-SETUP.md.</p>
            </div>
          )}
        </div>
        <div className="px-5">
          <h2 className="mt-4 text-center text-[20px] font-bold text-ink">Choose a ride</h2>
          <div className="mt-3"><ButterCallout tone="bar">Pay booking fees and the remaining payment after drop.</ButterCallout></div>

          <button type="button" className="mt-4 flex w-full items-center gap-3 rounded-card bg-plum-soft p-3 text-left">
            <span className="flex h-14 w-16 items-center justify-center rounded-xl bg-white text-3xl">🚕</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-bold text-ink">Intracity Pet Cab</span>
              <span className="block text-[13px] text-muted">{route ? `${route.km.toFixed(1)} km · ~${route.min} min` : '—'}</span>
            </span>
            <span className="text-right">
              <span className="block text-[15px] font-bold text-success">Pay ₹{bookingFee}</span>
              <span className="block text-[13px] text-muted">≈ ₹{fare ?? '—'} total</span>
            </span>
          </button>
        </div>
      </PageShell>
    );
  }

  // ── Step 4: fare breakdown ───────────────────────────────────────────────
  return (
    <PageShell variant="mint" size="compact" title="Travel" onBack={onBack} pills={pills}
      footer={<PillButton trailing={`₹${bookingFee}`} loading={busy} onClick={book}>Pay Booking Amount</PillButton>}>
      <div className="rounded-card bg-butter p-5 text-center">
        <p className="text-[14px] font-bold text-ink">Booking Amount</p>
        <p className="mt-1 text-[34px] font-extrabold text-success">₹{bookingFee}</p>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex justify-between text-[15px]"><span className="text-body">Booking amount (now)</span><span className="font-bold text-success">₹{bookingFee}</span></div>
        <div className="flex justify-between text-[15px]"><span className="text-body">Estimated fare</span><span className="text-ink">₹{fare}</span></div>
        <div className="flex justify-between text-[15px]"><span className="text-body">Balance after trip</span><span className="text-ink">₹{balance}</span></div>
        <div className="my-1 h-px bg-line" />
        <div className="flex justify-between text-[15px] font-bold text-plum"><span>Estimated total</span><span>₹{fare}</span></div>
      </div>

      <p className="mt-5 text-[12px] leading-[1.5] text-muted">Balance fare is collected after the trip. Estimate may vary with route &amp; waiting time.</p>
      {err && <p className="mt-3 text-[13px] font-medium text-danger">{err}</p>}
    </PageShell>
  );
}

export default function Page() { return <AuthGate><Travel /></AuthGate>; }
