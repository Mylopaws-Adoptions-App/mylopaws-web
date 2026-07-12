'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthGate, { useSession } from '@/components/AuthGate';
import PlaceInput, { PickedPlace } from '@/components/PlaceInput';
import PetPicker from '@/components/PetPicker';
import { supabase } from '@/lib/supabase';
import { payForOrder } from '@/lib/razorpay';
import { Address, Pet, Therapy, mapsLink } from '@/lib/types';
import { PageShell, PillButton, SelectChip, Field, LoadingState, ErrorState } from '@/components/design';

const SLOTS = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const to12 = (hhmm: string) => { const h = Number(hhmm.slice(0, 2)); return `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'AM' : 'PM'}`; };

function BookInner() {
  const { session } = useSession();
  const router = useRouter();
  const preselect = useSearchParams().get('preselect');

  const [therapies, setTherapies] = useState<Therapy[] | null>(null);
  const [error, setError] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(new Set(preselect ? [preselect] : []));
  const [pets, setPets] = useState<Pet[]>([]);
  const [pet, setPet] = useState<Pet | null>(null);
  const [saved, setSaved] = useState<Address[]>([]);
  const [addr, setAddr] = useState<PickedPlace | null>(null);
  const [date, setDate] = useState(''); const [slot, setSlot] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('therapies').select('*').eq('active', true).order('sort_order')
      .then(({ data, error }) => { if (error) setError(true); else setTherapies((data as Therapy[]) ?? []); });
    supabase.from('pets').select('*').eq('customer_id', session!.user.id).then(({ data }) => setPets((data as Pet[]) ?? []));
    supabase.from('addresses').select('*').eq('customer_id', session!.user.id).then(({ data }) => setSaved((data as Address[]) ?? []));
    supabase.from('customers').select('phone_number').eq('id', session!.user.id).single().then(({ data }) => setPhone(data?.phone_number ?? ''));
  }, [session]);

  const picked = useMemo(() => (therapies ?? []).filter(t => chosen.has(t.id)), [therapies, chosen]);
  const total = useMemo(() => picked.reduce((s, t) => s + Number(t.price), 0), [picked]);
  const toggle = (id: string) => setChosen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const canBook = chosen.size > 0 && pet && addr && date && slot && phone.trim().length >= 10;

  const book = async () => {
    if (!canBook || !therapies) return;
    setBusy(true); setErr(null);
    try {
      const { data: cust } = await supabase.from('customers').select('name, email').eq('id', session!.user.id).single();
      const { data: order, error } = await supabase.from('dermacare_orders').insert({
        customer_id: session!.user.id, pet_id: pet!.id,
        pawparent_name: cust?.name ?? 'Pawparent', furbaby_name: pet!.name, phone_number: phone.trim(),
        address_text: addr!.address, lat: addr!.lat, lng: addr!.lng, address_maps_link: mapsLink(addr!.lat, addr!.lng),
        date_of_appointment: date, time_of_appointment: slot,
        breed: pet!.breed, aggressive: pet!.aggressive,
        therapy_names: picked.map(t => t.branded_name).join(' + '),
      }).select('id').single();
      if (error) throw error;
      await supabase.from('dermacare_order_items').insert(picked.map(t => ({ order_id: order.id, therapy_id: t.id, price_at_booking: t.price })));
      await payForOrder('dermacare', order.id, { name: cust?.name ?? undefined, email: cust?.email ?? undefined, contact: phone.trim() });
      router.push(`/track/dermacare/${order.id}`);
    } catch (e: any) { setErr(e.message ?? 'Booking failed.'); }
    finally { setBusy(false); }
  };

  if (error) return <PageShell variant="plum" size="compact" title="Book Dermacare" onBack={() => router.back()}><ErrorState onRetry={() => location.reload()} /></PageShell>;
  if (!therapies) return <PageShell variant="plum" size="compact" title="Book Dermacare" onBack={() => router.back()}><LoadingState label="Loading therapies…" /></PageShell>;

  return (
    <PageShell variant="plum" size="large" title="Book Dermacare" subtitle="Bundle therapies & save a visit" onBack={() => router.back()}
      footer={<PillButton trailing={`₹${total}`} disabled={!canBook} loading={busy} onClick={book}>Pay &amp; book</PillButton>}>
      <section>
        <h2 className="text-[17px] font-bold text-ink">Choose therapies</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {therapies.map(t => (
            <SelectChip key={t.id} selected={chosen.has(t.id)} onClick={() => toggle(t.id)}
              label={`${t.branded_name.split(' —')[0].slice(0, 24)} · ₹${t.price}`} />
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-[17px] font-bold text-ink">Who&apos;s this for?</h2>
        <div className="mt-3"><PetPicker pets={pets} selected={pet} onSelect={setPet} onPetAdded={p => setPets(ps => [...ps, p])} userId={session!.user.id} /></div>
      </section>

      <section className="mt-7">
        <h2 className="text-[17px] font-bold text-ink">Where?</h2>
        {saved.length > 0 && (
          <div className="mb-3 mt-3 flex flex-wrap gap-2">
            {saved.map(a => <SelectChip key={a.id} label={a.label} selected={addr?.address === a.address_text}
              onClick={() => setAddr({ address: a.address_text, lat: a.lat ?? 0, lng: a.lng ?? 0 })} />)}
          </div>
        )}
        <div className="mt-3"><PlaceInput label="Or search an address" placeholder="Search address…" onPicked={setAddr} /></div>
        {addr && <p className="text-[13px] font-medium text-success">✓ {addr.address}</p>}
      </section>

      <section className="mt-7">
        <h2 className="text-[17px] font-bold text-ink">When?</h2>
        <p className="mt-0.5 text-[12px] text-muted">Mon–Sat, 11 AM – 6 PM</p>
        <div className="mt-3"><Field type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} /></div>
        <div className="flex flex-wrap gap-2">{SLOTS.map(s => <SelectChip key={s} label={to12(s)} selected={slot === s} onClick={() => setSlot(s)} />)}</div>
      </section>

      <section className="mt-7">
        <h2 className="text-[17px] font-bold text-ink">Contact number</h2>
        <div className="mt-3"><Field value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp number" inputMode="tel" /></div>
      </section>

      {picked.length > 0 && (
        <div className="mt-7 rounded-card bg-butter p-4">
          {picked.map(t => (
            <div key={t.id} className="mb-1 flex justify-between text-[14px]"><span className="truncate pr-4 text-ink">{t.branded_name}</span><span className="font-bold text-ink">₹{t.price}</span></div>
          ))}
          <div className="my-2 h-px bg-ink/15" />
          <div className="flex justify-between text-[15px] font-bold"><span className="text-ink">Total (payable now)</span><span className="text-plum">₹{total}</span></div>
        </div>
      )}

      {err && <p className="mt-3 text-[13px] font-medium text-danger">{err}</p>}
    </PageShell>
  );
}

export default function Page() {
  return <AuthGate><Suspense fallback={<div className="mx-auto flex min-h-screen max-w-[480px] items-center justify-center bg-white"><LoadingState /></div>}><BookInner /></Suspense></AuthGate>;
}
