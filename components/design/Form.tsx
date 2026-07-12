'use client';
import React from 'react';

/** Text input (SKILL: radius 12, height 52, surface-alt fill). */
export const Field = ({
  label,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <label className="mb-3 block">
    {label && <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>}
    <input
      {...props}
      className={`min-h-[52px] w-full rounded-input border border-line bg-surface-alt px-4 text-[15px] text-ink outline-none placeholder:text-muted focus:border-plum ${className}`}
    />
  </label>
);

/**
 * Selectable chip (SKILL section 5): behavioural tags / filters.
 * Selected = black fill / white text. Unselected = white / #E5E5E5 border / #333.
 */
export const SelectChip = ({
  label,
  selected,
  onClick,
}: {
  label: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={`min-h-[40px] rounded-full px-4 text-[14px] font-semibold transition-colors ${
      selected ? 'bg-ink text-white' : 'border border-line bg-white text-body'
    }`}
  >
    {label}
  </button>
);

/**
 * Segmented filter row (upcoming / live / past style). Uses plum-tint for the
 * active segment on a surface-alt track.
 */
export const Segmented = ({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex gap-1 rounded-full bg-surface-alt p-1">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        className={`min-h-[40px] flex-1 rounded-full text-[14px] font-semibold transition-colors ${
          value === o.value ? 'bg-plum text-white' : 'text-muted'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);
