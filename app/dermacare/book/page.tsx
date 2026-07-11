'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthGate, { useSession } from '@/components/AuthGate';
import Nav from '@/components/Nav';
import PlaceInput, { PickedPlace } from '@/components/PlaceInput';
import PetPicker from '@/components/PetPicker';
import { Btn, Card, Chip, Field, Spinner } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { payForOrder } from '@/lib/razorpay';
import { Address, Pet, Therapy, mapsLink } from '@/lib/types';

const SLOTS = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

function BookInner() {
  const { session } = useSession();
  const router = useRouter();
  const preselect = useSearchParams().get('preselect');

  const [therapies, setTherapies] = useState<Therapy[] | null>(null);
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
    supabase.from('therapies').select('*').eq('active', true).order('sort_order').then(({ data }) => setTherapies((data as Therapy[]) ?? []));
    supabase.from('pets').select('*').eq('customer_id', session!.user.id).then(({ data }) => setPets((data as Pet[]) ?? []));
    supabase.from('addresses').select('*').eq('customer_id', session!.user.id).then(({ data }) => setSaved((data as Address[]) ?? []));
    supabase.from('customers').select('phone_number').eq('id', session!.user.id).single().then(({ data }) => setPhone(data?.phone_number ?? ''));
  }, [session]);

  const total = useMemo(() => (therapies ?? []).filter(t => chosen.has(t.id)).reduce((s, t) => s + Number(t.price), 0), [therapies, chosen]);
  const toggle = (id: string) => setChosen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const canBook = chosen.size > 0 && pet && addr && date && slot && phone.trim().length >= 10;

  const book = async () => {
    if (!canBook || !therapies) return;
    setBusy(true); setErr(null);
    try {
      const picked = therapies.filter(t => chosen.has(t.id));
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

  if (!therapies) return <Spinner />;
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="font-display text-3xl font-black">Book Dermacare ✨</h1>
      <Card className="mt-5">
        <p className="mb-2 font-bold text-magenta">Pick therapies (bundle & save time)</p>
        <div className="flex flex-wrap">
          {therapies.map(t => <Chip key={t.id} label={`${t.branded_name.split(' —')[0].slice(0, 26)} · ₹${t.price}`} selected={chosen.has(t.id)} onClick={() => toggle(t.id)} />)}
        </div>
      </Card>
      <Card className="mt-4">
        <PetPicker pets={pets} selected={pet} onSelect={setPet} onPetAdded={p => setPets(ps => [...ps, p])} userId={session!.user.id} />
      </Card>
      <Card className="mt-4">
        <p className="mb-2 font-bold text-magenta">Where? 🏠</p>
        {saved.length > 0 && (
          <div className="mb-2 flex flex-wrap">
            {saved.map(a => <Chip key={a.id} label={a.label} selected={addr?.address === a.address_text}
              onClick={() => setAddr({ address: a.address_text, lat: a.lat ?? 0, lng: a.lng ?? 0 })} />)}
          </div>
        )}
        <PlaceInput label="Or search address" placeholder="Search address…" onPicked={setAddr} />
        {addr && <p className="text-sm font-semibold text-green-700">✓ {addr.address}</p>}
      </Card>
      <Card className="mt-4">
        <p className="mb-2 font-bold text-magenta">When? (Mon–Sat, 11 AM – 6 PM)</p>
        <Field label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <div className="flex flex-wrap">{SLOTS.map(s => <Chip key={s} label={s} selected={slot === s} onClick={() => setSlot(s)} />)}</div>
        <Field label="Contact number *" value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp number" />
      </Card>
      <Card className="mt-4 !border-brass bg-[#FFF9EC]">
        {therapies.filter(t => chosen.has(t.id)).map(t => (
          <div key={t.id} className="mb-1 flex justify-between text-sm"><span className="truncate pr-4">{t.branded_name}</span><span className="font-bold">₹{t.price}</span></div>
        ))}
        <div className="my-2 h-px bg-brass" />
        <div className="flex justify-between font-black"><span>Total (payable now)</span><span className="font-display text-lg text-magenta">₹{total}</span></div>
      </Card>
      {err && <p className="mt-3 text-sm font-semibold text-red-600">{err}</p>}
      <Btn onClick={book} disabled={!canBook} loading={busy} className="mt-4 mb-8 w-full">Pay ₹{total} & book</Btn>
    </main>
  );
}
export default function Page() {
  return <AuthGate><><Nav /><Suspense fallback={<Spinner />}><BookInner /></Suspense></></AuthGate>;
}
