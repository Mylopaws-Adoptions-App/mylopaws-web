'use client';
import React from 'react';

/**
 * DateField — a tappable date control that ALWAYS shows the chosen date in high
 * contrast. Native `<input type=date>` renders its value invisibly/empty on some
 * mobile browsers (iOS), so here the native input is laid over the control at
 * opacity 0 purely to drive the value + open the picker, while a styled label
 * shows the formatted selection (or a muted placeholder). Value is ISO YYYY-MM-DD.
 */
export function DateField({
  value,
  onChange,
  min,
  label,
  placeholder = 'Select a date',
}: {
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  label?: string;
  placeholder?: string;
}) {
  const pretty = React.useMemo(() => {
    if (!value) return '';
    // Parse as local date (avoid TZ shift from `new Date('YYYY-MM-DD')` UTC parsing).
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return '';
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  }, [value]);

  return (
    <label className="mb-3 block">
      {label && <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>}
      <div className="relative">
        <div
          className={`flex min-h-[52px] w-full items-center gap-2 rounded-input border px-4 text-[15px] transition ${
            value ? 'border-plum bg-plum-tint' : 'border-line bg-surface-alt'
          }`}
        >
          <span className="text-[16px]" aria-hidden>🗓</span>
          <span className={`font-semibold ${value ? 'text-plum' : 'text-muted'}`}>
            {pretty || placeholder}
          </span>
        </div>
        <input
          type="date"
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label ?? 'Choose a date'}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </label>
  );
}

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
      className={`flex h-[84px] w-[72px] shrink-0 flex-col items-center justify-center rounded-input border transition active:scale-95 ${
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
