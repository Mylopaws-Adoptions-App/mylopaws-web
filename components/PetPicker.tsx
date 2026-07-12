'use client';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Pet } from '@/lib/types';
import { PillButton, SelectChip, Field, Sheet } from '@/components/design';

export default function PetPicker({ pets, selected, onSelect, onPetAdded, userId }: {
  pets: Pet[]; selected: Pet | null; onSelect: (p: Pet) => void; onPetAdded: (p: Pet) => void; userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', breed: '', age: '', aggressive: false, rescue: false, notes: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!f.name.trim()) { setErr('Please give your furbaby a name'); return; }
    setSaving(true); setErr(null);
    const { data, error } = await supabase.from('pets').insert({
      customer_id: userId, name: f.name.trim(), breed: f.breed || null,
      age_years: f.age ? Number(f.age) : null, aggressive: f.aggressive, rescue: f.rescue, critical_notes: f.notes || null,
    }).select().single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onPetAdded(data as Pet); onSelect(data as Pet);
    setOpen(false); setF({ name: '', breed: '', age: '', aggressive: false, rescue: false, notes: '' });
  };

  const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex min-h-[48px] items-center gap-3 text-[15px] text-body">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-5 w-5 accent-plum" />
      {label}
    </label>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {pets.map(p => <SelectChip key={p.id} label={p.name} selected={selected?.id === p.id} onClick={() => onSelect(p)} />)}
        <SelectChip label="+ Add furbaby" onClick={() => setOpen(true)} />
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="New furbaby">
        <Field label="Name *" value={f.name} onChange={e => setF(s => ({ ...s, name: e.target.value }))} placeholder="e.g. Mylo" />
        <Field label="Breed" value={f.breed} onChange={e => setF(s => ({ ...s, breed: e.target.value }))} placeholder="e.g. Indie" />
        <Field label="Age (years)" value={f.age} onChange={e => setF(s => ({ ...s, age: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="e.g. 3" />
        <div className="mb-3">
          <Toggle label="Can be aggressive with strangers" checked={f.aggressive} onChange={v => setF(s => ({ ...s, aggressive: v }))} />
          <Toggle label="Rescue" checked={f.rescue} onChange={v => setF(s => ({ ...s, rescue: v }))} />
        </div>
        <Field label="Medical / critical notes" value={f.notes} onChange={e => setF(s => ({ ...s, notes: e.target.value }))} placeholder="Anything our partner should know" />
        {err && <p className="mb-3 text-[13px] font-medium text-danger">{err}</p>}
        <PillButton onClick={save} loading={saving}>Save furbaby</PillButton>
        <button onClick={() => setOpen(false)} className="mt-2 w-full py-3 text-[15px] font-semibold text-muted">Cancel</button>
      </Sheet>
    </div>
  );
}
