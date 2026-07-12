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

// Small hollow circle used as the "pickup" marker.
export const PickupDot = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2.5, ...p })}><circle cx="12" cy="12" r="6" /></svg>
);

// Map pin used as the "drop" marker.
export const DropPin = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
