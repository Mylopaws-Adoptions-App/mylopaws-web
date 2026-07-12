'use client';
import React from 'react';

/**
 * Bottom sheet: slides up from the bottom, 24px top corners (SKILL sheet radius),
 * dim backdrop. Constrained to the 480px shell. Used for pickers and search.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/40" />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[480px]">
        <div
          className="max-h-[85vh] overflow-y-auto rounded-t-sheet bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
          {title && <h3 className="mb-4 text-[20px] font-bold text-ink">{title}</h3>}
          {children}
        </div>
      </div>
    </div>
  );
}
