'use client';
import { useEffect, useState } from 'react';
import AuthGate, { useSession } from '@/components/AuthGate';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { Btn, Card, Field, Chip } from '@/components/ui';
import { Pet, Address } from '@/lib/types';
import PetPicker from '@/components/PetPicker';
import PlaceInput, { PickedPlace } from '@/components/PlaceInput';

function Profile() {
  const { session } = useSession();
  const [f, setF] = useState({ name: '', phone_number: '', email: '', city: 'Bengaluru' });
  const [pets, setPets] = useState<Pet[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [label, setLabel] = useState('Home');
  const [picked, setPicked] = useState<PickedPlace | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const loadAll = () => {
    supabase.from('customers').select('*').eq('id', session!.user.id).single().then(({ data }) => {
      if (data) setF({ name: data.name ?? '', phone_number: data.phone_number ?? '', email: data.email ?? '', city: data.city ?? 'Bengaluru' });
    });
    supabase.from('pets').select('*').eq('customer_id', session!.user.id).then(({ data }) => setPets((data as Pet[]) ?? []));
    supabase.from('addresses').select('*').eq('customer_id', session!.user.id).then(({ data }) => setAddresses((data as Address[]) ?? []));
    supabase.from('payments').select('*').eq('customer_id', session!.user.id).order('created_at', { ascending: false }).limit(10).then(({ data }) => setPayments(data ?? []));
  };
  useEffect(loadAll, [session]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('customers').update(f).eq('id', session!.user.id);
    setSaving(false); setMsg(error ? error.message : 'Saved! 🐾'); setTimeout(() => setMsg(''), 2500);
  };
  const addAddress = async () => {
    if (!picked) return;
    await supabase.from('addresses').insert({ customer_id: session!.user.id, label, address_text: picked.address, lat: picked.lat, lng: picked.lng });
    setPicked(null); setLabel('Home'); loadAll();
  };

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="font-display text-3xl font-black">Profile</h1>
      <Card className="mt-5">
        <Field label="Name" value={f.name} onChange={e => setF(s => ({ ...s, name: e.target.value }))} />
        <Field label="Phone (WhatsApp)" value={f.phone_number} onChange={e => setF(s => ({ ...s, phone_number: e.target.value }))} placeholder="+91…" />
        <Field label="Email" value={f.email} onChange={e => setF(s => ({ ...s, email: e.target.value }))} />
        <Field label="City" value={f.city} onChange={e => setF(s => ({ ...s, city: e.target.value }))} />
        <Btn onClick={save} loading={saving}>Save changes</Btn>
        {msg && <span className="ml-3 text-sm font-semibold text-green-700">{msg}</span>}
      </Card>

      <Card className="mt-4">
        <p className="mb-2 font-bold text-magenta">My furbabies 🐾</p>
        {pets.map(p => (
          <div key={p.id} className="mb-2 flex items-center justify-between rounded-xl bg-cream p-3">
            <div>
              <p className="font-bold">{p.name} {p.rescue ? '🏳️' : ''}</p>
              <p className="text-xs text-ink-soft">{[p.breed, p.age_years ? `${p.age_years} yrs` : null, p.aggressive ? '⚠️ can be aggressive' : null].filter(Boolean).join(' · ') || '—'}</p>
            </div>
            <button onClick={async () => { await supabase.from('pets').delete().eq('id', p.id); loadAll(); }}
              className="min-h-[40px] rounded-full px-3 text-sm font-bold text-red-600 hover:bg-red-50">Remove</button>
          </div>
        ))}
        <PetPicker pets={[]} selected={null} onSelect={() => {}} onPetAdded={loadAll} userId={session!.user.id} />
      </Card>

      <Card className="mt-4">
        <p className="mb-2 font-bold text-magenta">Saved addresses 📍</p>
        {addresses.map(a => (
          <div key={a.id} className="mb-2 flex items-center justify-between rounded-xl bg-cream p-3">
            <div className="min-w-0"><p className="font-bold">{a.label}</p><p className="truncate text-xs text-ink-soft">{a.address_text}</p></div>
            <button onClick={async () => { await supabase.from('addresses').delete().eq('id', a.id); loadAll(); }}
              className="min-h-[40px] shrink-0 rounded-full px-3 text-sm font-bold text-red-600 hover:bg-red-50">Delete</button>
          </div>
        ))}
        <Field label="Label" value={label} onChange={e => setLabel(e.target.value)} placeholder="Home / Office" />
        <PlaceInput label="Address" placeholder="Search address…" onPicked={setPicked} />
        {picked && <p className="mb-2 text-sm font-semibold text-green-700">✓ {picked.address}</p>}
        <Btn kind="ghost" onClick={addAddress} disabled={!picked}>Save address</Btn>
      </Card>

      <Card className="mt-4">
        <p className="mb-2 font-bold text-magenta">Payment history</p>
        {payments.length === 0 ? <p className="text-sm text-ink-soft">No payments yet.</p> : payments.map(p => (
          <div key={p.id} className="flex justify-between border-b border-line py-2 text-sm last:border-0">
            <span className="font-semibold">₹{p.amount} · {p.order_type} #{p.order_id}</span>
            <span className={`font-black text-xs ${p.status === 'paid' ? 'text-green-700' : p.status === 'failed' ? 'text-red-600' : 'text-ink-soft'}`}>{p.status.toUpperCase()}</span>
          </div>
        ))}
      </Card>
      <p className="mt-6 mb-8 text-center text-xs text-ink-soft">Mylopaws · Bengaluru 🐾</p>
    </main>
  );
}
export default function Page() { return <AuthGate><><Nav /><Profile /></></AuthGate>; }
