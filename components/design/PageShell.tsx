'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from './icons';
import { showTabBar } from '@/components/TabBar';

/**
 * THE signature Mylopaws layout (SKILL section 4): a full-bleed colored header
 * with a white sheet sliding up and overlapping it (24px radius on the top two
 * corners only).
 *
 *  - variant="mint"  → Travel flow. Header text is #111 (ink).
 *  - variant="plum"  → pet / profile flows. Header text is white.
 *
 * Two header sizes seen in the designs:
 *  - size="large"    → big 32/800 title + one-line subtitle (screen 10, 20).
 *  - size="compact"  → small inline "‹ Travel" 20/700 wordmark (screens 11–14).
 *
 * The whole screen is constrained to max-w-[480px] and centered so it stays
 * phone-shaped on desktop instead of stretching.
 */
export function PageShell({
  variant = 'mint',
  size = 'large',
  title,
  tagline,
  subtitle,
  onBack,
  rightAction,
  pills,
  footer,
  children,
  headerClassName = '',
  sheetClassName = '',
  contentKey,
}: {
  variant?: 'mint' | 'plum';
  size?: 'large' | 'compact';
  title: string;
  /** Optional accent tagline rendered directly under the title (caller styles color). */
  tagline?: React.ReactNode;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  /** Mode-pill row (or any node) rendered inside the header, below the title. */
  pills?: React.ReactNode;
  /** Bottom-anchored CTA bar. Rendered fixed and width-matched to the shell. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  headerClassName?: string;
  sheetClassName?: string;
  /**
   * When provided, the sheet content is keyed by this value and re-plays the
   * `.mp-step` fade whenever it changes — used by multi-step flows (Travel) so
   * moving between steps transitions instead of snapping. Purely presentational:
   * it never scrolls or resets parent-held state.
   */
  contentKey?: React.Key;
}) {
  const onColor = variant === 'plum' ? 'text-white' : 'text-ink';
  const headerBg = variant === 'plum' ? 'bg-plum' : 'bg-mint';
  // Stage 6: when the persistent tab bar is present on this route, reserve its height at the
  // bottom of the sheet and lift the fixed CTA to stack directly above it.
  const withTab = showTabBar(usePathname());

  return (
    <div className={`relative mx-auto min-h-screen max-w-[480px] overflow-x-clip ${headerBg}`}>
      <header className={`px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] ${size === 'large' ? 'pb-8' : 'pb-6'} ${onColor} ${headerClassName}`}>
        {size === 'large' ? (
          <>
            <div className="mb-5 flex items-start justify-between">
              {onBack ? (
                <button type="button" onClick={onBack} aria-label="Go back"
                  className="-ml-1 flex h-11 w-11 items-center justify-center">
                  <ChevronLeft className="h-6 w-6" />
                </button>
              ) : <span className="h-11 w-11" />}
              {rightAction}
            </div>
            <h1 className="text-[32px] font-extrabold leading-tight tracking-[-0.5px]">{title}</h1>
            {tagline && <p className="mt-1.5 text-[14px] font-semibold">{tagline}</p>}
            {subtitle && <p className="mt-1 text-[15px] opacity-90">{subtitle}</p>}
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {onBack && (
                <button type="button" onClick={onBack} aria-label="Go back"
                  className="-ml-1 flex h-11 w-11 items-center justify-center">
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              <span className="text-[20px] font-bold">{title}</span>
            </div>
            {rightAction}
          </div>
        )}
        {pills && <div className="mt-5">{pills}</div>}
      </header>

      <main className={`-mt-4 min-h-[70vh] rounded-t-[24px] bg-white px-5 pt-7 ${footer ? 'pb-32' : 'pb-10'} ${sheetClassName}`}>
        {contentKey !== undefined ? <div key={contentKey} className="mp-step">{children}</div> : children}
        {/* Spacer reserves the tab-bar footprint so trailing content is never hidden behind it,
            regardless of any sheetClassName padding override. */}
        {withTab && <div aria-hidden className="h-[calc(56px_+_env(safe-area-inset-bottom))]" />}
      </main>

      {footer && (
        <div className={`fixed left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-white px-5 pt-3 ${
          withTab ? 'bottom-[calc(56px_+_env(safe-area-inset-bottom))]' : 'bottom-0 pb-[env(safe-area-inset-bottom)]'
        }`}>
          <div className="pb-3">{footer}</div>
        </div>
      )}
    </div>
  );
}
