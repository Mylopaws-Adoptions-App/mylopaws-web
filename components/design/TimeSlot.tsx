'use client';
import React from 'react';

/**
 * Time slot (SKILL section 5): pill-ish rounded rect, meant for a 3-column grid.
 *  - unselected → white, bordered, muted text.
 *  - selected   → #E7D3DF (plum.tint) fill, plum border, plum 700 text.
 * Ref: 11-travel-datetime.
 */
export function TimeSlot({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex h-12 items-center justify-center rounded-xl border text-[14px] transition-colors ${
        selected
          ? 'border-plum bg-plum-tint font-bold text-plum'
          : 'border-line bg-white font-medium text-muted'
      }`}
    >
      {label}
    </button>
  );
}
