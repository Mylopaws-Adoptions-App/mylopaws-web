'use client';
import React from 'react';

/**
 * Route transition wrapper (issue 1). A Next.js `template` re-mounts on every
 * navigation, so wrapping children in `.mp-page` gives each new route a subtle,
 * fast (~200ms) fade-in-and-rise instead of a hard snap. The animation is defined
 * inside a `prefers-reduced-motion: no-preference` block in globals.css, so
 * reduced-motion users simply get an instant render.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="mp-page">{children}</div>;
}
