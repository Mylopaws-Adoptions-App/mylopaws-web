import React from 'react';

// Minimal inline icon set (no icon dependency in the project).
// All icons inherit `currentColor` and default to 24px; size via className.

type IconProps = React.SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

export const ChevronLeft = (p: IconProps) => (
  <svg {...base(p)}><path d="M15 18l-6-6 6-6" /></svg>
);

export const ChevronRight = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 18l6-6-6-6" /></svg>
);

export const ChevronDown = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 9l6 6 6-6" /></svg>
);

export const Clock = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);

export const Plus = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);

export const Check = (p: IconProps) => (
  <svg {...base(p)}><path d="M20 6L9 17l-5-5" /></svg>
);

export const Close = (p: IconProps) => (
  <svg {...base(p)}><path d="M18 6L6 18M6 6l12 12" /></svg>
);

// Left-aligned magnifier for search overlays.
export const Search = (p: IconProps) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M21 21l-3.5-3.5" /></svg>
);

// Small hollow circle used as the "pickup" marker.
export const PickupDot = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2.5, ...p })}><circle cx="12" cy="12" r="6" /></svg>
);

// Spinning loader — used for in-flight CTAs (Razorpay order creation, saves).
// A loading spinner is an intentional, functional progress indicator, so it keeps
// turning; the button is also disabled + relabelled, giving reduced-motion users
// non-animated confirmation that the tap registered.
export const Spinner = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2.5, ...p })} className={`animate-spin ${p.className ?? ''}`}>
    <path d="M12 3a9 9 0 1 0 9 9" opacity="0.9" />
  </svg>
);

// Map pin used as the "drop" marker.
export const DropPin = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
