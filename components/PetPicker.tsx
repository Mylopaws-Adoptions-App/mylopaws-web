'use client';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Pet } from '@/lib/types';
import { Btn, Chip, Field } from './ui';

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

  return (
    <div>
      <p className="mb-2 font-bold text-ink">Who's this for? 🐕</p>
      <div className="flex flex-wrap">
        {pets.map(p => <Chip key={p.id} label={p.name} selected={selected?.id === p.id} onClick={() => onSelect(p)} />)}
        <Chip label="+ Add furbaby" onClick={() => setOpen(true)} />
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 font-display text-xl font-black text-magenta">New furbaby</h3>
            <Field label="Name *" value={f.name} onChange={e => setF(s => ({ ...s, name: e.target.value }))} placeholder="e.g. Mylo" />
            <Field label="Breed" value={f.breed} onChange={e => setF(s => ({ ...s, breed: e.target.value }))} placeholder="e.g. Indie" />
            <Field label="Age (years)" value={f.age} onChange={e => setF(s => ({ ...s, age: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="e.g. 3" />
            <label className="mb-2 flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={f.aggressive} onChange={e => setF(s => ({ ...s, aggressive: e.target.checked }))} className="h-5 w-5 accent-magenta" /> Can be aggressive with strangers</label>
            <label className="mb-3 flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={f.rescue} onChange={e => setF(s => ({ ...s, rescue: e.target.checked }))} className="h-5 w-5 accent-magenta" /> Rescue</label>
            <Field label="Medical / critical notes" value={f.notes} onChange={e => setF(s => ({ ...s, notes: e.target.value }))} placeholder="Anything our partner should know" />
            {err && <p className="mb-2 text-sm text-red-600">{err}</p>}
            <Btn onClick={save} loading={saving} className="w-full">Save furbaby</Btn>
            <Btn kind="ghost" onClick={() => setOpen(false)} className="mt-2 w-full">Cancel</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
