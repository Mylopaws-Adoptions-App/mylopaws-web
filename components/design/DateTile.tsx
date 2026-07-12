'use client';
import React from 'react';

/**
 * Date tile (SKILL section 5): 72px wide, radius 12.
 *  - unselected → white, #E5E5E5 border; day-abbrev 12/muted above 20/700 date.
 *  - selected   → #E7D3DF (plum.tint) fill, plum border, plum text.
 * Ref: 11-travel-datetime.
 */
export function DateTile({
  day,
  date,
  selected,
  onClick,
}: {
  /** e.g. "SAT" */
  day: string;
  /** e.g. "07" */
  date: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex h-[84px] w-[72px] shrink-0 flex-col items-center justify-center rounded-input border transition-colors ${
        selected
          ? 'border-plum bg-plum-tint text-plum'
          : 'border-line bg-white text-muted'
      }`}
    >
      <span className="text-[12px] font-medium tracking-wide">{day}</span>
      <span className={`mt-1 text-[20px] font-bold ${selected ? 'text-plum' : 'text-ink'}`}>{date}</span>
    </button>
  );
}
