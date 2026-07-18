'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthGate, { useSession } from '@/components/AuthGate';
import PlaceInput, { PickedPlace } from '@/components/PlaceInput';
import PetPicker from '@/components/PetPicker';
import { supabase } from '@/lib/supabase';
import { payForOrder, confirmPaid } from '@/lib/razorpay';
import { toast } from '@/lib/toast';
import { track } from '@/lib/analytics';
import { Address, Pet, Service, Addon, mapsLink, rupees, placeName } from '@/lib/types';
import { PageShell, PillButton, SelectChip, Field, DateField, LoadingState, ErrorState, Icons } from '@/components/design';

const SLOTS = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const to12 = (hhmm: string) => { const h = Number(hhmm.slice(0, 2)); return `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'AM' : 'PM'}`; };

type Step = 1 | 2 | 3 | 4 | 5;

function BookInner() {
  const { session } = useSession();
  const router = useRouter();
  const preselect = useSearchParams().get('service');

  const [services, setServices] = useState<Service[] | null>(null);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [error, setError] = useState(false);

  const [step, setStep] = useState<Step>(1);
  const [service, setService] = useState<Service | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [petsCount, setPetsCount] = useState(1);
  const [pets, setPets] = useState<Pet[]>([]);
  const [pet, setPet] = useState<Pet | null>(null);
  const [saved, setSaved] = useState<Address[]>([]);
  const [addr, setAddr] = useState<PickedPlace | null>(null);
  const [date, setDate] = useState(''); const [slot, setSlot] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Analytics: entered the dermacare booking flow (fires once on mount).
  useEffect(() => { track('booking_start', { vertical: 'dermacare' }); }, []);

  useEffect(() => {
    supabase.from('services').select('*').eq('active', true).order('sort_order')
      .then(({ data, error }) => {
        if (error) { setError(true); return; }
        const list = (data as Service[]) ?? [];
        setServices(list);
        setService(list.find(s => s.id === preselect) ?? list.find(s => s.popular) ?? list[0] ?? null);
      });
    supabase.from('addons').select('*').eq('active', true).order('sort_order').then(({ data }) => setAddons((data as Addon[]) ?? []));
    supabase.from('pets').select('*').eq('customer_id', session!.user.id).then(({ data }) => setPets((data as Pet[]) ?? []));
    supabase.from('addresses').select('*').eq('customer_id', session!.user.id).then(({ data }) => setSaved((data as Address[]) ?? []));
    supabase.from('customers').select('phone_number').eq('id', session!.user.id).single().then(({ data }) => setPhone(data?.phone_number ?? ''));
  }, [session, preselect]);

  const pickedAddons = useMemo(() => addons.filter(a => chosen.has(a.id)), [addons, chosen]);
  const serviceSubtotal = service ? Number(service.base_price) * petsCount : 0;
  const addonsSubtotal = pickedAddons.reduce((s, a) => s + Number(a.price), 0);
  const estTotal = serviceSubtotal + addonsSubtotal;
  const toggle = (id: string) => setChosen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const book = async () => {
    if (!service || !pet || !addr || !date || !slot || phone.trim().length < 10) return;
    setBusy(true); setErr(null);
    try {
      const { data: cust } = await supabase.from('customers').select('name, email').eq('id', session!.user.id).single();
      const therapyNames = [service.name, ...pickedAddons.map(a => a.name)].join(' + ');
      const { data: order, error } = await supabase.from('dermacare_orders').insert({
        customer_id: session!.user.id, pet_id: pet.id,
        pawparent_name: cust?.name ?? 'Pawparent', furbaby_name: pet.name, phone_number: phone.trim(),
        address_text: addr.address, lat: addr.lat, lng: addr.lng, address_maps_link: mapsLink(addr.lat, addr.lng), address_name: addr.name,
        date_of_appointment: date, time_of_appointment: slot,
        breed: pet.breed, aggressive: pet.aggressive,
        pets_count: petsCount, therapy_names: therapyNames,
      }).select('id').single();
      if (error) throw error;
      // One service row + one row per add-on. Amount is recomputed server-side
      // (service × pets_count + add-ons) by the razorpay-create-order edge function.
      const items = [
        { order_id: order.id, service_id: service.id, price_at_booking: Number(service.base_price) },
        ...pickedAddons.map(a => ({ order_id: order.id, addon_id: a.id, price_at_booking: Number(a.price) })),
      ];
      const { error: itemsErr } = await supabase.from('dermacare_order_items').insert(items);
      if (itemsErr) throw itemsErr;
      track('add_payment_info', { vertical: 'dermacare', value: estTotal, currency: 'INR' });
      const outcome = await payForOrder('dermacare', order.id, { name: cust?.name ?? undefined, email: cust?.email ?? undefined, contact: phone.trim() });
      if (outcome === 'dismissed') {
        track('payment_failed', { vertical: 'dermacare', reason: 'dismissed' });
        setErr('Payment not completed. Tap “Pay & book” to try again.');
        toast('Payment not completed — you can try again.', 'info');
        return;
      }
      // Verify server-side (webhook) before treating the booking as confirmed.
      const result = await confirmPaid('dermacare', order.id);
      if (result === 'paid') {
        track('purchase', { transaction_id: String(order.id), value: estTotal, currency: 'INR', vertical: 'dermacare', pets_count: petsCount });
        toast('Booking confirmed ✨', 'success');
        router.push(`/track/dermacare/${order.id}`);
      } else if (result === 'failed') {
        track('payment_failed', { vertical: 'dermacare', reason: 'failed' });
        setErr('Payment failed. Tap “Pay & book” to try again.');
        toast('Payment failed — please try again.', 'error');
      } else {
        setErr('We’re confirming your payment — it’ll appear in My Bookings shortly.');
        toast('Confirming your payment…', 'info');
      }
    } catch (e: any) {
      setErr(e.message ?? 'Booking failed.');
      toast(e.message ?? 'Booking failed.', 'error');
    }
    finally { setBusy(false); }
  };

  const onBack = () => (step === 1 ? router.push('/dermacare') : setStep((step - 1) as Step));

  if (error) return <PageShell variant="plum" size="compact" title="Book Dermacare" onBack={() => router.push('/dermacare')}><ErrorState onRetry={() => location.reload()} /></PageShell>;
  if (!services || !service) return <PageShell variant="plum" size="compact" title="Book Dermacare" onBack={() => router.push('/dermacare')}><LoadingState label="Loading services…" /></PageShell>;

  const EstBar = () => (
    <p className="mb-3 text-center text-[13px] text-muted">Estimated total <span className="font-bold text-plum">{rupees(estTotal)}</span></p>
  );

  // ── Step 1: choose service ───────────────────────────────────────────────
  if (step === 1) {
    return (
      <PageShell variant="plum" size="large" title="Choose a service" subtitle="Full Service is our most-booked" onBack={onBack} contentKey={step}
        footer={<PillButton onClick={() => setStep(2)}>Next</PillButton>}>
        <div className="space-y-3">
          {services.map(s => {
            const sel = service.id === s.id;
            return (
              <button key={s.id} onClick={() => { setService(s); track('select_service', { vertical: 'dermacare', item_id: s.id, item_name: s.name, price: Number(s.base_price) }); }}
                className={`w-full rounded-card border p-4 text-left transition active:scale-[0.98] ${sel ? 'border-plum bg-plum-soft' : 'border-line bg-white shadow-card'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {s.popular && <span className="mb-1 inline-block rounded-full bg-butter px-2 py-0.5 text-[10px] font-bold text-plum">MOST BOOKED</span>}
                    <h3 className="text-[16px] font-bold text-ink">{s.name}</h3>
                    {s.tagline && <p className="mt-0.5 text-[12px] text-muted">{s.tagline}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[11px] text-muted">from</div>
                    <div className="text-[17px] font-extrabold text-plum">{rupees(s.base_price)}</div>
                    <div className="text-[11px] text-muted">~{s.duration_min} min</div>
                  </div>
                </div>
                {sel && s.includes && s.includes.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {s.includes.map(it => <li key={it} className="flex items-start gap-2 text-[12px] text-body"><Icons.Check className="mt-0.5 h-3 w-3 shrink-0 text-success" />{it}</li>)}
                  </ul>
                )}
              </button>
            );
          })}
        </div>
      </PageShell>
    );
  }

  // ── Step 2: add-ons ──────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <PageShell variant="plum" size="large" title="Add-ons" subtitle="Optional extras for your pet" onBack={onBack} contentKey={step}
        footer={<><EstBar /><PillButton onClick={() => setStep(3)}>Next</PillButton></>}>
        <div className="space-y-3">
          {addons.map(a => {
            const sel = chosen.has(a.id);
            return (
              <button key={a.id} onClick={() => { track('select_addon', { vertical: 'dermacare', item_id: a.id, item_name: a.name, price: Number(a.price), selected: !chosen.has(a.id) }); toggle(a.id); }}
                className={`flex w-full items-start gap-3 rounded-card border p-4 text-left transition active:scale-[0.98] ${sel ? 'border-plum bg-plum-soft' : 'border-line bg-white shadow-card'}`}>
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${sel ? 'border-plum bg-plum text-white' : 'border-line bg-white'}`}>
                  {sel && <Icons.Check className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-bold text-ink">{a.name}</span>
                    <span className="shrink-0 text-[15px] font-bold text-plum">{rupees(a.price)}</span>
                  </span>
                  {a.description && <span className="mt-0.5 block text-[12px] leading-[1.45] text-muted">{a.description}</span>}
                  {a.name === 'Medicated Bath' && <span className="mt-1 block text-[12px] font-semibold text-success">Recommended if your pet has itching, redness or odour.</span>}
                </span>
              </button>
            );
          })}
        </div>
      </PageShell>
    );
  }

  // ── Step 3: pets ─────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <PageShell variant="plum" size="large" title="Your pets" subtitle="Pricing scales per pet" onBack={onBack} contentKey={step}
        footer={<><EstBar /><PillButton disabled={!pet} onClick={() => setStep(4)}>Next</PillButton></>}>
        <h2 className="text-[17px] font-bold text-ink">How many pets?</h2>
        <div className="mt-3 flex items-center gap-4">
          <button onClick={() => setPetsCount(n => Math.max(1, n - 1))} aria-label="Fewer"
            className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-plum text-[22px] font-bold text-plum">−</button>
          <span className="w-8 text-center text-[22px] font-bold text-ink">{petsCount}</span>
          <button onClick={() => setPetsCount(n => Math.min(6, n + 1))} aria-label="More"
            className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-plum text-[22px] font-bold text-plum">+</button>
        </div>

        <h2 className="mt-7 text-[17px] font-bold text-ink">Who&apos;s the main pet?</h2>
        <div className="mt-3"><PetPicker pets={pets} selected={pet} onSelect={setPet} onPetAdded={p => setPets(ps => [...ps, p])} userId={session!.user.id} /></div>
        {petsCount > 1 && <p className="mt-3 text-[12px] text-muted">We&apos;ll confirm details for all {petsCount} pets on arrival.</p>}
      </PageShell>
    );
  }

  // ── Step 4: where & when ─────────────────────────────────────────────────
  if (step === 4) {
    const ready = !!(addr && date && slot && phone.trim().length >= 10);
    return (
      <PageShell variant="plum" size="large" title="Where & when" subtitle="Mon–Sat, 11 AM – 6 PM" onBack={onBack} contentKey={step}
        footer={<><EstBar /><PillButton disabled={!ready} onClick={() => { track('begin_checkout', { vertical: 'dermacare', value: estTotal, currency: 'INR', pets_count: petsCount }); setStep(5); }}>Review</PillButton></>}>
        <h2 className="text-[17px] font-bold text-ink">Address</h2>
        {saved.length > 0 && (
          <div className="mb-3 mt-3 flex flex-wrap gap-2">
            {saved.map(a => <SelectChip key={a.id} label={a.label} selected={addr?.address === a.address_text}
              onClick={() => setAddr({ name: a.label, address: a.address_text, lat: a.lat ?? 0, lng: a.lng ?? 0 })} />)}
          </div>
        )}
        <div className="mt-3"><PlaceInput label="Or search an address" placeholder="Search address…" onPicked={setAddr} /></div>
        {addr && <p className="text-[13px] font-medium text-success">✓ {placeName(addr.name, addr.address)}</p>}

        <h2 className="mt-7 text-[17px] font-bold text-ink">Date &amp; time</h2>
        <div className="mt-3"><DateField value={date} min={new Date().toISOString().slice(0, 10)} onChange={setDate} /></div>
        <div className="flex flex-wrap gap-2">{SLOTS.map(s => <SelectChip key={s} label={to12(s)} selected={slot === s} onClick={() => setSlot(s)} />)}</div>

        <h2 className="mt-7 text-[17px] font-bold text-ink">Contact number</h2>
        <div className="mt-3"><Field value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp number" inputMode="tel" /></div>
      </PageShell>
    );
  }

  // ── Step 5: review ───────────────────────────────────────────────────────
  return (
    <PageShell variant="plum" size="large" title="Review" subtitle="Check your booking" onBack={onBack} contentKey={step}
      footer={<PillButton trailing={rupees(estTotal)} loading={busy} onClick={book}>Pay &amp; book</PillButton>}>
      <div className="rounded-card border border-line bg-white p-4 shadow-card">
        <div className="flex justify-between text-[15px]">
          <span className="text-body">{service.name} <span className="text-muted">× {petsCount} pet{petsCount === 1 ? '' : 's'}</span></span>
          <span className="font-bold text-ink">{rupees(serviceSubtotal)}</span>
        </div>
        {pickedAddons.map(a => (
          <div key={a.id} className="mt-2 flex justify-between text-[14px]">
            <span className="text-body">{a.name}</span><span className="text-ink">{rupees(a.price)}</span>
          </div>
        ))}
        <div className="my-3 h-px bg-line" />
        <div className="flex justify-between text-[16px] font-bold text-plum"><span>Estimated total</span><span>{rupees(estTotal)}</span></div>
      </div>

      <div className="mt-4 space-y-1 text-[14px] text-body">
        <p>🐾 {pet?.name}{petsCount > 1 ? ` +${petsCount - 1}` : ''}</p>
        <p>🏠 {addr ? placeName(addr.name, addr.address) : ''}</p>
        <p>🗓 {date} · {slot && to12(slot)}</p>
      </div>

      <p className="mt-5 rounded-xl bg-surface-alt p-3 text-[12px] leading-[1.5] text-muted">
        Final price is confirmed by our specialist based on your pet&apos;s size and coat — you&apos;ll be told before we begin.
      </p>
      {err && <p className="mt-3 text-[13px] font-medium text-danger">{err}</p>}
    </PageShell>
  );
}

export default function Page() {
  return <AuthGate><Suspense fallback={<div className="mx-auto flex min-h-screen max-w-[480px] items-center justify-center bg-white"><LoadingState /></div>}><BookInner /></Suspense></AuthGate>;
}
