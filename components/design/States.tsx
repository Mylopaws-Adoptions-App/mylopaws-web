'use client';
import React from 'react';
import { PillButton } from './PillButton';

/**
 * Standard data-state components (SKILL section 7 requires loading / empty /
 * error on every data-driven screen). Styled in the design language: plum
 * spinner, geometric-sans copy, muted subtext.
 */

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted" role="status" aria-live="polite">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-plum" />
      <p className="mt-4 text-[14px]">{label}</p>
    </div>
  );
}

export function EmptyState({
  emoji = '🐾',
  title,
  sub,
  action,
}: {
  emoji?: string;
  title: string;
  sub?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="text-5xl">{emoji}</div>
      <h3 className="mt-3 text-[20px] font-bold text-ink">{title}</h3>
      {sub && <p className="mt-1 max-w-xs text-[14px] leading-[1.5] text-muted">{sub}</p>}
      {action && (
        <div className="mt-6 w-full max-w-[240px]">
          <PillButton onClick={action.onClick}>{action.label}</PillButton>
        </div>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  sub = 'Please try again in a moment.',
  onRetry,
}: {
  title?: string;
  sub?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center" role="alert">
      <div className="text-5xl">😿</div>
      <h3 className="mt-3 text-[20px] font-bold text-ink">{title}</h3>
      <p className="mt-1 max-w-xs text-[14px] leading-[1.5] text-muted">{sub}</p>
      {onRetry && (
        <div className="mt-6 w-full max-w-[240px]">
          <PillButton variant="secondary" onClick={onRetry}>Try again</PillButton>
        </div>
      )}
    </div>
  );
}
