'use client';
import React from 'react';
import { Clock, ChevronDown } from './icons';

/**
 * Date/time recap pill (SKILL section 5): after date + time are chosen they
 * collapse into a small pill at the top of the next screen.
 * #F5E9F0 (plum.soft) fill, plum text, clock icon, chevron to re-edit.
 * e.g. "🕐 Sat, 7th Jul | 5:00 PM ⌄"   Ref: 13-travel-location-filled.
 */
export function RecapPill({ text, onClick }: { text: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-full bg-plum-soft px-4 text-[14px] font-medium text-plum transition active:scale-[0.97]"
    >
      <Clock className="h-4 w-4" />
      <span>{text}</span>
      <ChevronDown className="h-4 w-4" />
    </button>
  );
}
