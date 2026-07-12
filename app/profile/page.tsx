'use client';
import { useEffect, useState } from 'react';
import AuthGate, { useSession } from '@/components/AuthGate';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { Pet, Address } from '@/lib/types';
import PetPicker from '@/components/PetPicker';
import PlaceInput, { PickedPlace } from '@/components/PlaceInput';
import { PageShell, PillButton, Field } from '@/components/design';

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

  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mt-7">
      <h2 className="mb-3 text-[17px] font-bold text-ink">{title}</h2>
      {children}
    </section>
  );

  return (
    <PageShell variant="plum" size="large" title="Profile" sheetClassName="pb-28">
      <Group title="Your details">
        <Field label="Name" value={f.name} onChange={e => setF(s => ({ ...s, name: e.target.value }))} />
        <Field label="Phone (WhatsApp)" value={f.phone_number} onChange={e => setF(s => ({ ...s, phone_number: e.target.value }))} placeholder="+91…" inputMode="tel" />
        <Field label="Email" value={f.email} onChange={e => setF(s => ({ ...s, email: e.target.value }))} />
        <Field label="City" value={f.city} onChange={e => setF(s => ({ ...s, city: e.target.value }))} />
        <div className="flex items-center gap-3">
          <div className="w-40"><PillButton onClick={save} loading={saving}>Save changes</PillButton></div>
          {msg && <span className="text-[13px] font-semibold text-success">{msg}</span>}
        </div>
      </Group>

      <Group title="My furbabies 🐾">
        <div className="space-y-2">
          {pets.map(p => (
            <div key={p.id} className="flex items-center justify-between rounded-card bg-surface-alt p-3">
              <div className="min-w-0">
                <p className="font-bold text-ink">{p.name} {p.rescue ? '🏳️' : ''}</p>
                <p className="text-[12px] text-muted">{[p.breed, p.age_years ? `${p.age_years} yrs` : null, p.aggressive ? '⚠️ can be aggressive' : null].filter(Boolean).join(' · ') || '—'}</p>
              </div>
              <button onClick={async () => { await supabase.from('pets').delete().eq('id', p.id); loadAll(); }}
                className="min-h-[44px] shrink-0 rounded-full px-3 text-[13px] font-bold text-danger">Remove</button>
            </div>
          ))}
        </div>
        <div className="mt-3"><PetPicker pets={[]} selected={null} onSelect={() => {}} onPetAdded={loadAll} userId={session!.user.id} /></div>
      </Group>

      <Group title="Saved addresses 📍">
        <div className="space-y-2">
          {addresses.map(a => (
            <div key={a.id} className="flex items-center justify-between rounded-card bg-surface-alt p-3">
              <div className="min-w-0"><p className="font-bold text-ink">{a.label}</p><p className="truncate text-[12px] text-muted">{a.address_text}</p></div>
              <button onClick={async () => { await supabase.from('addresses').delete().eq('id', a.id); loadAll(); }}
                className="min-h-[44px] shrink-0 rounded-full px-3 text-[13px] font-bold text-danger">Delete</button>
            </div>
          ))}
        </div>
        <div className="mt-3"><Field label="Label" value={label} onChange={e => setLabel(e.target.value)} placeholder="Home / Office" /></div>
        <PlaceInput label="Address" placeholder="Search address…" onPicked={setPicked} />
        {picked && <p className="mb-2 text-[13px] font-semibold text-success">✓ {picked.address}</p>}
        <PillButton variant="secondary" onClick={addAddress} disabled={!picked}>Save address</PillButton>
      </Group>

      <Group title="Payment history">
        {payments.length === 0 ? <p className="text-[14px] text-muted">No payments yet.</p> : (
          <div className="rounded-card border border-line bg-white shadow-card">
            {payments.map(p => (
              <div key={p.id} className="flex justify-between border-b border-line px-4 py-3 text-[14px] last:border-0">
                <span className="font-semibold text-ink">₹{p.amount} · {p.order_type} #{p.order_id}</span>
                <span className={`text-[12px] font-bold ${p.status === 'paid' ? 'text-success' : p.status === 'failed' ? 'text-danger' : 'text-muted'}`}>{p.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}
      </Group>

      <button onClick={() => supabase.auth.signOut().then(() => location.assign('/login'))}
        className="mt-8 flex min-h-[52px] w-full items-center justify-center rounded-btn border-[1.5px] border-danger text-[15px] font-bold text-danger">
        Log out
      </button>
      <p className="mt-6 text-center text-[12px] text-muted">Mylopaws · Bengaluru 🐾</p>

      <Nav />
    </PageShell>
  );
}

export default function Page() { return <AuthGate><Profile /></AuthGate>; }
