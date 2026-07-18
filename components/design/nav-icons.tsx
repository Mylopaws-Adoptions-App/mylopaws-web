import React from 'react';

// Bottom-tab line icons (SKILL section 5 tab bar). Inherit currentColor so the
// active tab tints plum. 24px default.
type P = React.SVGProps<SVGSVGElement>;
const svg = (p: P) => ({
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, ...p,
});

export const HomeIcon = (p: P) => (
  <svg {...svg(p)}><path d="M3 10.5L12 4l9 6.5" /><path d="M5 9.5V20h14V9.5" /><path d="M9.5 20v-5h5v5" /></svg>
);
export const CarIcon = (p: P) => (
  <svg {...svg(p)}><path d="M5 16l1.2-4.2A3 3 0 019.1 9.6h5.8a3 3 0 012.9 2.2L19 16" /><path d="M4 16h16v3H4z" /><circle cx="7.5" cy="19" r="1.2" /><circle cx="16.5" cy="19" r="1.2" /></svg>
);
export const SparkleIcon = (p: P) => (
  <svg {...svg(p)}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" /></svg>
);
export const ListIcon = (p: P) => (
  <svg {...svg(p)}><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></svg>
);
export const UserIcon = (p: P) => (
  <svg {...svg(p)}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" /></svg>
);

// ── Ops bottom-nav icons ──
export const CatIcon = (p: P) => (
  <svg {...svg(p)}><path d="M5 10V5l3 2.2a7 7 0 018 0L19 5v5" /><path d="M5 10a7 7 0 0014 0v3a7 7 0 01-14 0z" /><path d="M9.5 13.5h.01M14.5 13.5h.01" /><path d="M12 15.5v1.2" /></svg>
);
export const TeamIcon = (p: P) => (
  <svg {...svg(p)}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" /><path d="M16 6.5a3 3 0 010 5.8" /><path d="M17.5 15.2c2 .7 3.5 2.3 3.5 4.8" /></svg>
);
export const MicIcon = (p: P) => (
  <svg {...svg(p)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0012 0" /><path d="M12 17v4M9 21h6" /></svg>
);
export const MegaphoneIcon = (p: P) => (
  <svg {...svg(p)}><path d="M4 10v4a1 1 0 001 1h2l7 4V5L7 9H5a1 1 0 00-1 1z" /><path d="M17 8a4 4 0 010 8" /></svg>
);
export const MoreIcon = (p: P) => (
  <svg {...svg(p)}><circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" /></svg>
);
