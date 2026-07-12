'use client';
import React from 'react';
import { PickupDot, DropPin, Plus } from './icons';

/**
 * Pickup → Drop connected input group (SKILL section 5).
 * ONE bordered card containing two stacked rows separated by a hairline. A
 * pickup dot and a drop pin sit on the left, joined by a vertical connector
 * line. When both are filled the whole card gets a plum border and the icons
 * turn plum. A circular "+" button sits outside to the right to add a stop.
 * Ref: 12-travel-location-empty, 13-travel-location-filled.
 *
 * Presentational only — the parent owns place selection and passes the chosen
 * values in. `onPickupClick` / `onDropClick` open whatever picker the parent uses.
 */
export function PickupDropInput({
  pickup,
  drop,
  onPickupClick,
  onDropClick,
  onAddStop,
  pickupPlaceholder = 'Pick up',
  dropPlaceholder = 'Drop',
}: {
  pickup?: string;
  drop?: string;
  onPickupClick?: () => void;
  onDropClick?: () => void;
  onAddStop?: () => void;
  pickupPlaceholder?: string;
  dropPlaceholder?: string;
}) {
  const filled = Boolean(pickup && drop);
  const iconColor = filled ? 'text-plum' : 'text-muted';

  const Row = ({
    icon,
    value,
    placeholder,
    onClick,
  }: {
    icon: React.ReactNode;
    value?: string;
    placeholder: string;
    onClick?: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[52px] w-full items-center gap-3 px-3 text-left"
    >
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center ${iconColor}`}>{icon}</span>
      <span className={`truncate text-[15px] ${value ? 'text-ink' : 'text-muted'}`}>
        {value || placeholder}
      </span>
    </button>
  );

  return (
    <div className="flex items-start gap-3">
      <div className={`relative flex-1 rounded-input border ${filled ? 'border-plum' : 'border-line'}`}>
        {/* vertical connector between the two markers */}
        <span
          aria-hidden
          className={`absolute left-[27px] top-[30px] h-[44px] w-px ${filled ? 'bg-plum/40' : 'bg-line'}`}
        />
        <Row icon={<PickupDot className="h-5 w-5" />} value={pickup} placeholder={pickupPlaceholder} onClick={onPickupClick} />
        <div className="mx-3 h-px bg-line" />
        <Row icon={<DropPin className="h-5 w-5" />} value={drop} placeholder={dropPlaceholder} onClick={onDropClick} />
      </div>

      {onAddStop && (
        <button
          type="button"
          onClick={onAddStop}
          aria-label="Add a stop"
          className="mt-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-plum-soft text-plum"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
