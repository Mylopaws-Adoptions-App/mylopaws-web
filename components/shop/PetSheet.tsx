'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { Sheet, PillButton, Field, SelectChip, Icons } from '@/components/design';
import { useShop } from './ShopProvider';
import type { ShopPet } from '@/lib/shop';

/** Quick pet profile used to personalise picks (species and weight decide sizes, e.g. tick medicines). */
export function PetSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pet, setPet, session } = useShop();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(pet?.name ?? ''); setSpecies(pet?.species ?? 'dog');
    setWeight(pet?.weight_kg ? String(pet.weight_kg) : ''); setAge(pet?.age_years ? String(pet.age_years) : ''); setErr('');
  }, [open, pet]);

  const save = async () => {
    if (!name.trim()) { setErr('What’s your pet called?'); return; }
    const w = weight ? Number(weight) : null;
    if (w !== null && !(w > 0 && w < 120)) { setErr('Please check the weight (kg)'); return; }
    const next: ShopPet = { id: pet?.id, name: name.trim().slice(0, 40), species, weight_kg: w, age_years: age ? Number(age) : null, breed: pet?.breed ?? null };
    setSaving(true);
    if (session) {
      const row = { customer_id: session.user.id, name: next.name, species, weight_kg: w, age_years: next.age_years };
      const res = next.id
        ? await supabase.from('pets').update(row).eq('id', next.id).select('id').single()
        : await supabase.from('pets').insert(row).select('id').single();
      if (!res.error && res.data) next.id = res.data.id;
    }
    setSaving(false);
    setPet(next);
    track('shop_pet_saved', { species });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={pet ? 'Your pet' : 'Who are we shopping for?'}>
      <p className="-mt-1 mb-4 text-[14px] leading-[1.5] text-body">Mylo uses this to pick the right products and sizes. 🐾</p>
      <div className="mb-4 flex gap-2">
        <SelectChip label="🐶 Dog" selected={species === 'dog'} onClick={() => setSpecies('dog')} />
        <SelectChip label="🐱 Cat" selected={species === 'cat'} onClick={() => setSpecies('cat')} />
      </div>
      <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bruno" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Weight (kg)" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="e.g. 18" />
        <Field label="Age (years)" inputMode="decimal" value={age} onChange={(e) => setAge(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="e.g. 3" />
      </div>
      {err && <p className="mb-3 text-[13px] font-medium text-danger">{err}</p>}
      <PillButton onClick={save} loading={saving}>Save</PillButton>
      {pet && (
        <button type="button" onClick={() => { setPet(null); onClose(); }} className="mt-2 w-full py-2 text-[14px] font-semibold text-muted">
          Shop without a pet profile
        </button>
      )}
    </Sheet>
  );
}

/** "Shopping for Bruno 🐶 ⌄" pill that opens the pet sheet. */
export function PetPill({ onDark }: { onDark?: boolean }) {
  const { pet } = useShop();
  const [open, setOpen] = useState(false);
  const cls = onDark ? 'bg-white/15 text-white' : 'bg-plum-soft text-plum';
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold ${cls}`}>
        {pet ? <>{pet.species === 'cat' ? '🐱' : '🐶'} Shopping for {pet.name}{pet.weight_kg ? ` · ${pet.weight_kg} kg` : ''}</> : <>🐾 Add your pet for better picks</>}
        <Icons.ChevronDown className="h-4 w-4" />
      </button>
      <PetSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
