'use client';
import React from 'react';
import { PillButton } from './PillButton';
import { Photo } from './Photo';
import type { MediaKey } from '@/lib/media';

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

/**
 * Skeleton primitives (issue 4). Data screens should show a shape-matched
 * placeholder that shimmers, then fade the real content in — never a bare spinner
 * or blank flash. `.mp-skel` gives the static grey fill (visible under
 * reduced-motion); `.mp-skeleton` adds the shimmer sweep (gated in globals.css).
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`mp-skel mp-skeleton ${className}`} aria-hidden />;
}

/** A card-shaped skeleton row (booking list, service card, detail card). */
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`mt-3 h-3 ${i === 0 ? 'w-3/4' : 'w-1/2'}`} />
      ))}
    </div>
  );
}

/** A vertical stack of `count` card skeletons, wrapped in a polite live region. */
export function SkeletonList({ count = 3, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <div className="mt-4 space-y-3" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} lines={lines} />)}
    </div>
  );
}

export function EmptyState({
  emoji = '🐾',
  photo,
  title,
  sub,
  action,
}: {
  emoji?: string;
  /** Optional warm photo shown instead of the emoji. */
  photo?: MediaKey;
  title: string;
  sub?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {photo
        ? <Photo srcKey={photo} alt="" className="mb-4 h-32 w-44" sizes="176px" />
        : <div className="text-5xl">{emoji}</div>}
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
