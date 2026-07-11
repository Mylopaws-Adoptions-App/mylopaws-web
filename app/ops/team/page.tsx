'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase, invokeFn } from '@/lib/supabase';
import { Btn, Card, Chip, Field, Spinner } from '@/components/ui';
import { Staff } from '@/lib/types';

export default function Team() {
  const [rows, setRows] = useState<Staff[] | null>(null);
  const [f, setF] = useState({ name: '', email: '', password: '', phone: '', vehicle: '', role: 'supplier' as 'supplier' | 'admin' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    supabase.from('staff').select('*').order('created_at').then(({ data }) => setRows((data as Staff[]) ?? []));
  }, []);
  useEffect(load, [load]);

  const create = async () => {
    if (!f.name || !f.email || f.password.length < 8) { setMsg('Name, email and a password of 8+ characters are required.'); return; }
    setSaving(true); setMsg('');
    try {
      await invokeFn('create-staff', { name: f.name, email: f.email.trim(), password: f.password, phone_number: f.phone || null, vehicle_type: f.vehicle || null, role: f.role });
      setMsg(`✓ ${f.name} can now log in at /ops with ${f.email}. Share the password securely.`);
      setF({ name: '', email: '', password: '', phone: '', vehicle: '', role: 'supplier' });
      load();
    } catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); }
  };

  if (!rows) return <Spinner />;
  return (
    <main className="mx-auto max-w-3xl px-5 py-6">
      <h1 className="font-display text-2xl font-black">👷 Team & Suppliers</h1>
      <div className="mt-4 space-y-2">
        {rows.map(r => (
          <Card key={r.id} className={`flex items-center justify-between ${r.active ? '' : 'opacity-50'}`}>
            <div>
              <p className="font-bold">{r.name} {r.role === 'admin' ? '· 👑 Admin' : ''}</p>
              <p className="text-xs text-ink-soft">{[r.email, r.phone_number, r.vehicle_type].filter(Boolean).join(' · ')}</p>
            </div>
            <button onClick={async () => { await supabase.from('staff').update({ active: !r.active }).eq('id', r.id); load(); }}
              className={`min-h-[40px] rounded-full px-4 text-sm font-black ${r.active ? 'bg-green-100 text-green-800' : 'bg-line text-ink-soft'}`}>
              {r.active ? 'Active' : 'Inactive'}
            </button>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <p className="mb-3 font-bold text-night">Add team member</p>
        <div className="mb-2 flex">
          <Chip label="Supplier" selected={f.role === 'supplier'} onClick={() => setF(s => ({ ...s, role: 'supplier' }))} />
          <Chip label="Admin" selected={f.role === 'admin'} onClick={() => setF(s => ({ ...s, role: 'admin' }))} />
        </div>
        <Field label="Name *" value={f.name} onChange={e => setF(s => ({ ...s, name: e.target.value }))} />
        <Field label="Email (login) *" type="email" value={f.email} onChange={e => setF(s => ({ ...s, email: e.target.value }))} />
        <Field label="Temporary password * (8+ chars)" type="password" value={f.password} onChange={e => setF(s => ({ ...s, password: e.target.value }))} />
        <Field label="Phone" value={f.phone} onChange={e => setF(s => ({ ...s, phone: e.target.value }))} />
        {f.role === 'supplier' && <Field label="Vehicle type" value={f.vehicle} onChange={e => setF(s => ({ ...s, vehicle: e.target.value }))} placeholder="e.g. WagonR, Activa, —" />}
        {msg && <p className="mb-2 text-sm font-semibold text-magenta">{msg}</p>}
        <Btn kind="secondary" onClick={create} loading={saving}>Create account</Btn>
      </Card>
    </main>
  );
}
