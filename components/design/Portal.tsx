'use client';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into document.body, escaping any transformed/animated ancestor.
 *
 * WHY: a `position: fixed` element anchors to the nearest ancestor that has a transform,
 * filter, or an active (fill-mode) animation — not the viewport. Our route wrapper
 * `.mp-page` (app/template.tsx) animates `transform` with `animation-fill-mode: both`, so it
 * stays a containing block forever and any fixed bar rendered inside a page scrolls away with
 * the content. Wrapping a fixed bar in <Portal> mounts it on <body>, guaranteeing it stays
 * pinned to the viewport (same reasoning as mounting TabBar at the layout root).
 *
 * Returns null until mounted so it is SSR-safe; the bar's placeholder space is reserved by the
 * page (e.g. PageShell's pb-32), so nothing shifts when it appears on hydration.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
