'use client';
import React from 'react';
import { ChevronRight } from './icons';

/**
 * Primary CTA button (SKILL section 5).
 *  - primary   → plum fill, white 700 label, 28px pill, ~54px tall.
 *  - secondary → white fill, 1.5px plum border, plum label.
 *  - disabled  → #DEDEDE fill, #9A9A9A label (see 02-signin "Get OTP").
 *
 * `trailing` renders a value + chevron on the right, e.g. the fare-breakdown
 * CTA "Pay Booking Amount            ₹105  ›" (screen 15).
 */
export function PillButton({
  children,
  onClick,
  variant = 'primary',
  disabled,
  loading,
  type = 'button',
  fullWidth = true,
  trailing,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  fullWidth?: boolean;
  /** Value shown on the right; a chevron is appended automatically. */
  trailing?: React.ReactNode;
  className?: string;
}) {
  const isDisabled = disabled || loading;

  const variants = {
    primary: 'bg-plum text-white active:bg-plum-dark',
    secondary: 'bg-white text-plum border-[1.5px] border-plum active:bg-plum-soft',
  };
  const disabledCls = 'bg-[#DEDEDE] text-[#9A9A9A] border-transparent';

  const base =
    'inline-flex items-center justify-center min-h-[54px] rounded-btn px-6 text-[16px] font-bold transition-colors active:scale-[0.99] disabled:pointer-events-none';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`${base} ${fullWidth ? 'w-full' : ''} ${isDisabled ? disabledCls : variants[variant]} ${trailing ? 'justify-between' : ''} ${className}`}
    >
      {loading ? (
        <span className="animate-pulse">•••</span>
      ) : trailing ? (
        <>
          <span>{children}</span>
          <span className="flex items-center gap-1.5">
            <span>{trailing}</span>
            <ChevronRight className="h-[18px] w-[18px]" />
          </span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
