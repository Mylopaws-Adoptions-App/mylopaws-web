'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { Pet, AGGRESSION_META } from '@/lib/types';
import { PillButton, SelectChip, Field, Portal, Icons } from '@/components/design';

const EMPTY = { name: '', breed: '', age: '', aggression: 0, rescue: false, notes: '' };

export default function PetPicker({ pets, selected, onSelect, onPetAdded, userId }: {
  pets: Pet[]; selected: Pet | null; onSelect: (p: Pet) => void; onPetAdded: (p: Pet) => void; userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Lock background scroll while the full-screen form is up (it covers everything, but this also
  // stops scroll-chaining behind it on iOS).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const close = () => { setOpen(false); setErr(null); setF(EMPTY); };

  const save = async () => {
    if (!f.name.trim()) { setErr('Please give your furbaby a name'); return; }
    setSaving(true); setErr(null);
    const { data, error } = await supabase.from('pets').insert({
      customer_id: userId, name: f.name.trim(), breed: f.breed || null,
      age_years: f.age ? Number(f.age) : null,
      aggression_level: f.aggression, aggressive: f.aggression >= 2, // keep boolean in sync for back-compat
      rescue: f.rescue, critical_notes: f.notes || null,
    }).select().single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    track('add_pet');
    onPetAdded(data as Pet); onSelect(data as Pet);
    setOpen(false); setF(EMPTY);
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

      {/*
        Add Furbaby is a REQUIRED step in the booking funnel, so it's a dedicated full-screen form
        (not a modal/sheet — skill §9 modal-vs-navigation). Portaled to <body> so it escapes the
        animated `.mp-page` ancestor and covers the viewport (hiding the bottom nav — no collision).
        Layout is a flex column: plum header ▸ scrollable body ▸ PINNED Save footer. Height is 100dvh
        and, with viewport interactive-widget=resizes-content, the keyboard shrinks the viewport so the
        footer + focused field stay above it. No field auto-focuses, so the keyboard only opens on tap.
      */}
      {open && (
        <Portal>
          <div className="fixed inset-0 z-50 flex justify-center bg-white">
            <div className="mp-search-in flex h-[100dvh] w-full max-w-[480px] flex-col bg-white">
              {/* Header */}
              <header className="flex items-center gap-2 bg-plum px-4 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white">
                <button type="button" onClick={close} aria-label="Cancel"
                  className="-ml-1 flex h-11 w-11 items-center justify-center text-white">
                  <Icons.ChevronLeft className="h-6 w-6" />
                </button>
                <h1 className="text-[22px] font-bold">New furbaby</h1>
              </header>

              {/* Scrollable body — min-h-0 lets this flex child actually scroll instead of growing */}
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <Field label="Name *" value={f.name} onChange={e => setF(s => ({ ...s, name: e.target.value }))} placeholder="e.g. Mylo" />
                <Field label="Breed" value={f.breed} onChange={e => setF(s => ({ ...s, breed: e.target.value }))} placeholder="e.g. Indie" />
                <Field label="Age (years)" inputMode="decimal" value={f.age}
                  onChange={e => setF(s => ({ ...s, age: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="e.g. 3" />
                <div className="mb-3">
                  <p className="mb-1.5 text-[13px] font-medium text-muted">How does your pet handle strangers? <span className="text-[12px]">(helps our groomer stay safe)</span></p>
                  <div className="flex flex-wrap gap-2">
                    {AGGRESSION_META.map((a, i) => (
                      <SelectChip key={i} label={`${i} · ${a.label}`} selected={f.aggression === i} onClick={() => setF(s => ({ ...s, aggression: i }))} />
                    ))}
                  </div>
                </div>
                <div className="mb-3"><Toggle label="Rescue" checked={f.rescue} onChange={v => setF(s => ({ ...s, rescue: v }))} /></div>
                <Field label="Medical / critical notes" value={f.notes} onChange={e => setF(s => ({ ...s, notes: e.target.value }))} placeholder="Anything our partner should know" />
                {err && <p className="mt-1 text-[13px] font-medium text-danger">{err}</p>}
              </div>

              {/* Pinned action footer — always reachable regardless of scroll or keyboard */}
              <div className="border-t border-line bg-white px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
                <PillButton onClick={save} loading={saving}>Save furbaby</PillButton>
                <button type="button" onClick={close} className="mt-2 w-full py-2 text-[15px] font-semibold text-muted">Cancel</button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
