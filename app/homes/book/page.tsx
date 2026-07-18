'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate, { useSession } from '@/components/AuthGate';
import PetPicker from '@/components/PetPicker';
import { Btn, Card, Field } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Pet, HOMES_PROVIDER, HOMES_RATE_PER_NIGHT, nightsBetween } from '@/lib/types';

const today = () => new Date().toISOString().slice(0, 10);

function Book() {
  const { session } = useSession();
  const router = useRouter();

  const [pets, setPets] = useState<Pet[]>([]);
  const [pet, setPet] = useState<Pet | null>(null);
  const [numCats, setNumCats] = useState(1);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('pets').select('*').eq('customer_id', session!.user.id).then(({ data }) => setPets((data as Pet[]) ?? []));
    supabase.from('customers').select('phone_number').eq('id', session!.user.id).single().then(({ data }) => setPhone(data?.phone_number ?? ''));
  }, [session]);

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const total = nights * HOMES_RATE_PER_NIGHT * numCats;
  const canBook = pet && nights > 0 && numCats >= 1 && phone.trim().length >= 10;

  const book = async () => {
    if (!canBook) return;
    setBusy(true); setErr(null);
    try {
      const { data: cust } = await supabase.from('customers').select('name').eq('id', session!.user.id).single();
      const { data: order, error } = await supabase.from('homes_orders').insert({
        customer_id: session!.user.id, pet_id: pet!.id, provider: HOMES_PROVIDER,
        pawparent_name: cust?.name ?? 'Pawparent', furbaby_name: pet!.name, phone_number: phone.trim(),
        check_in: checkIn, check_out: checkOut, nights, num_cats: numCats,
        rate_per_night: HOMES_RATE_PER_NIGHT, total_estimate: total,
        notes: notes.trim() || null,
      }).select('id').single();
      if (error) throw error;
      router.push(`/homes/booking/${order.id}`);
    } catch (e: any) { setErr(e.message ?? 'Could not send your request. Please try again.'); }
    finally { setBusy(false); }
  };

  return (
    <main className="mx-auto max-w-2xl px-5 pt-8 pb-28">
      <h1 className="font-display text-3xl font-black">Request a Stay 🐱</h1>
      <p className="mt-1 text-sm text-ink-soft">{HOMES_PROVIDER} · we’ll confirm availability before any payment.</p>

      <Card className="mt-5">
        <PetPicker pets={pets} selected={pet} onSelect={setPet} onPetAdded={p => setPets(ps => [...ps, p])} userId={session!.user.id} />
        <div className="mt-3">
          <span className="mb-1 block text-[13px] font-semibold text-ink-soft">How many cats in total?</span>
          <div className="inline-flex items-center gap-4 rounded-xl border-2 border-line px-4 py-2">
            <button type="button" onClick={() => setNumCats(n => Math.max(1, n - 1))} className="text-xl font-black text-magenta">−</button>
            <span className="min-w-[1.5rem] text-center font-bold">{numCats}</span>
            <button type="button" onClick={() => setNumCats(n => Math.min(10, n + 1))} className="text-xl font-black text-magenta">+</button>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <p className="mb-2 font-bold text-magenta">Dates</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Check-in" type="date" min={today()} value={checkIn}
            onChange={e => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut(''); }} />
          <Field label="Check-out" type="date" min={checkIn || today()} value={checkOut} onChange={e => setCheckOut(e.target.value)} />
        </div>
        {nights > 0 && <p className="text-sm font-semibold text-green-700">✓ {nights} night{nights > 1 ? 's' : ''}</p>}
        <Field label="Contact number *" value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp number" />
        <Field label="Anything Joanna should know?" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Diet, meds, temperament, litter habits…" />
      </Card>

      <Card className="mt-4 !border-brass bg-[#FFF9EC]">
        <div className="flex justify-between text-sm"><span className="text-ink-soft">₹{HOMES_RATE_PER_NIGHT} × {nights || 0} night{nights === 1 ? '' : 's'} × {numCats} cat{numCats === 1 ? '' : 's'}</span></div>
        <div className="my-2 h-px bg-brass" />
        <div className="flex justify-between font-black"><span>Estimated total</span><span className="font-display text-lg text-magenta">₹{total}</span></div>
        <p className="mt-2 text-xs text-ink-soft">Estimate only — no payment now. Joanna confirms the final quote and availability first.</p>
      </Card>

      {err && <p className="mt-3 text-sm font-semibold text-red-600">{err}</p>}
      <Btn onClick={book} disabled={!canBook} loading={busy} className="mt-4 mb-10 w-full">Send booking request</Btn>
    </main>
  );
}
export default function Page() { return <AuthGate><Book /></AuthGate>; }
