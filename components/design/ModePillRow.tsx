'use client';
import React from 'react';

/**
 * Travel mode pills (SKILL section 5): horizontally scrollable row.
 *  - selected   → black fill, white text.
 *  - unselected → white fill, 1.5px #111 border, #111 text.
 * Radius 999px, ~40px tall. Ref: 11-travel-datetime, 14-travel-choose-ride.
 */
export function ModePill({
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
      className={`h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold transition-colors ${
        selected
          ? 'bg-ink text-white'
          : 'border-[1.5px] border-ink bg-white text-ink'
      }`}
    >
      {label}
    </button>
  );
}

export function ModePillRow({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((opt) => (
        <ModePill key={opt} label={opt} selected={opt === value} onClick={() => onChange(opt)} />
      ))}
    </div>
  );
}
