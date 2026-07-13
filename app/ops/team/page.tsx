'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase, invokeFn } from '@/lib/supabase';
import { Staff } from '@/lib/types';
import { PillButton, Field, SelectChip, LoadingState } from '@/components/design';

const VERTICALS = [{ v: 'travel', label: '🚗 Travel' }, { v: 'dermacare', label: '✨ Dermacare' }];

export default function Team() {
  const [rows, setRows] = useState<Staff[] | null>(null);
  const [f, setF] = useState({ name: '', email: '', password: '', phone: '', vehicle: '', role: 'supplier' as 'supplier' | 'admin', verticals: ['dermacare'] as string[] });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    supabase.from('staff').select('*').order('created_at').then(({ data }) => setRows((data as Staff[]) ?? []));
  }, []);
  useEffect(load, [load]);

  const toggleFormVertical = (v: string) =>
    setF(s => ({ ...s, verticals: s.verticals.includes(v) ? s.verticals.filter(x => x !== v) : [...s.verticals, v] }));

  const setRowVerticals = async (r: Staff, verticals: string[]) => {
    if (verticals.length === 0) return; // must serve at least one
    await supabase.from('staff').update({ verticals }).eq('id', r.id);
    load();
  };

  const create = async () => {
    if (!f.name || !f.email || f.password.length < 8) { setMsg('Name, email and a password of 8+ characters are required.'); return; }
    if (f.role === 'supplier' && f.verticals.length === 0) { setMsg('Pick at least one vertical this supplier serves.'); return; }
    setSaving(true); setMsg('');
    try {
      await invokeFn('create-staff', {
        name: f.name, email: f.email.trim(), password: f.password, phone_number: f.phone || null,
        vehicle_type: f.vehicle || null, role: f.role, verticals: f.verticals,
      });
      setMsg(`✓ ${f.name} can now log in at /ops with ${f.email}. Share the password securely.`);
      setF({ name: '', email: '', password: '', phone: '', vehicle: '', role: 'supplier', verticals: ['dermacare'] });
      load();
    } catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); }
  };

  if (!rows) return <LoadingState label="Loading team…" />;

  return (
    <main className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="text-[22px] font-extrabold tracking-[-0.5px] text-ink">👷 Team &amp; Suppliers</h1>

      <div className="mt-4 space-y-3">
        {rows.map(r => (
          <div key={r.id} className={`rounded-card border border-line bg-white p-4 shadow-card ${r.active ? '' : 'opacity-60'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-ink">{r.name} {r.role === 'admin' ? '· 👑 Admin' : ''}</p>
                <p className="truncate text-[12px] text-muted">{[r.email, r.phone_number, r.vehicle_type].filter(Boolean).join(' · ')}</p>
              </div>
              <button onClick={async () => { await supabase.from('staff').update({ active: !r.active }).eq('id', r.id); load(); }}
                className={`min-h-[40px] shrink-0 rounded-full px-4 text-[13px] font-bold ${r.active ? 'bg-mint/50 text-ink' : 'bg-surface-alt text-muted'}`}>
                {r.active ? 'Active' : 'Inactive'}
              </button>
            </div>
            {r.role === 'supplier' && (
              <div className="mt-3">
                <p className="mb-1.5 text-[12px] font-medium text-muted">Serves</p>
                <div className="flex flex-wrap gap-2">
                  {VERTICALS.map(({ v, label }) => {
                    const on = (r.verticals ?? []).includes(v);
                    return <SelectChip key={v} label={label} selected={on}
                      onClick={() => setRowVerticals(r, on ? (r.verticals ?? []).filter(x => x !== v) : [...(r.verticals ?? []), v])} />;
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-card border border-line bg-white p-4 shadow-card">
        <p className="mb-3 text-[16px] font-bold text-ink">Add team member</p>
        <div className="mb-3 flex gap-2">
          <SelectChip label="Supplier" selected={f.role === 'supplier'} onClick={() => setF(s => ({ ...s, role: 'supplier' }))} />
          <SelectChip label="Admin" selected={f.role === 'admin'} onClick={() => setF(s => ({ ...s, role: 'admin' }))} />
        </div>
        <Field label="Name *" value={f.name} onChange={e => setF(s => ({ ...s, name: e.target.value }))} />
        <Field label="Email (login) *" type="email" value={f.email} onChange={e => setF(s => ({ ...s, email: e.target.value }))} />
        <Field label="Temporary password * (8+ chars)" type="password" value={f.password} onChange={e => setF(s => ({ ...s, password: e.target.value }))} />
        <Field label="Phone" value={f.phone} onChange={e => setF(s => ({ ...s, phone: e.target.value }))} inputMode="tel" />
        {f.role === 'supplier' && <>
          <Field label="Vehicle type" value={f.vehicle} onChange={e => setF(s => ({ ...s, vehicle: e.target.value }))} placeholder="e.g. WagonR, Activa, —" />
          <p className="mb-1.5 text-[13px] font-medium text-muted">Serves which verticals? *</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {VERTICALS.map(({ v, label }) => <SelectChip key={v} label={label} selected={f.verticals.includes(v)} onClick={() => toggleFormVertical(v)} />)}
          </div>
        </>}
        {msg && <p className="mb-2 text-[13px] font-semibold text-plum">{msg}</p>}
        <PillButton onClick={create} loading={saving}>Create account</PillButton>
      </div>
    </main>
  );
}
