'use client';
import React from 'react';

/**
 * Butter callout (SKILL section 5): a #F8DE64 rounded card with body copy and,
 * optionally, a white full-width pill button inside it (plum 700 label).
 * Ref: 25-chat.
 *
 * `tone="bar"` renders the slimmer butter note bar seen above the ride list on
 * 14-travel-choose-ride ("Pay booking fees and the remaining payment after drop.").
 */
export function ButterCallout({
  children,
  action,
  tone = 'card',
  className = '',
}: {
  children: React.ReactNode;
  action?: { label: string; onClick?: () => void };
  tone?: 'card' | 'bar';
  className?: string;
}) {
  if (tone === 'bar') {
    return (
      <div className={`rounded-xl bg-butter/60 px-4 py-3 text-center text-[13px] font-medium text-ink ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div className={`rounded-card bg-butter p-4 ${className}`}>
      <div className="text-[14px] leading-[1.5] text-ink">{children}</div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-full bg-white text-[15px] font-bold text-plum"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
