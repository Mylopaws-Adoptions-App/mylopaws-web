'use client';
import React from 'react';
import { STATUS_META } from '@/lib/types';

export function Btn({ children, onClick, kind = 'primary', disabled, loading, className = '', type = 'button' }: {
  children: React.ReactNode; onClick?: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean; loading?: boolean; className?: string; type?: 'button' | 'submit';
}) {
  const base = 'inline-flex items-center justify-center min-h-[48px] px-5 rounded-2xl font-bold text-[15px] transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
  const kinds = {
    primary: 'bg-magenta text-white hover:bg-magenta-dark shadow-[0_4px_14px_rgba(105,26,71,0.25)]',
    secondary: 'bg-night text-white hover:opacity-90',
    ghost: 'border-2 border-magenta text-magenta hover:bg-magenta/5',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={`${base} ${kinds[kind]} ${className}`}>
      {loading ? <span className="animate-pulse">•••</span> : children}
    </button>
  );
}

export const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-2xl border border-line p-5 shadow-[0_2px_10px_rgba(43,34,51,0.04)] ${className}`}>{children}</div>
);

export const Badge = ({ status }: { status: string }) => {
  const m = STATUS_META[status] ?? STATUS_META.unassigned;
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${m.cls}`}>{m.label}</span>;
};

export const Spinner = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center py-24 text-ink-soft">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-magenta" />
    <p className="mt-4 text-sm">{label}</p>
  </div>
);

export const Empty = ({ emoji = '🐾', title, sub }: { emoji?: string; title: string; sub?: string }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
    <div className="text-5xl">{emoji}</div>
    <h3 className="mt-3 font-display text-xl font-bold text-ink">{title}</h3>
    {sub && <p className="mt-1 max-w-sm text-sm text-ink-soft">{sub}</p>}
  </div>
);

export const Field = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <label className="mb-4 block">
    {label && <span className="mb-1 block text-[13px] font-semibold text-ink-soft">{label}</span>}
    <input {...props} className={`w-full min-h-[48px] rounded-xl border-2 border-line bg-white px-4 text-[15px] text-ink outline-none focus:border-magenta ${props.className ?? ''}`} />
  </label>
);

export const Chip = ({ label, selected, onClick }: { label: string; selected?: boolean; onClick?: () => void }) => (
  <button type="button" onClick={onClick}
    className={`mr-2 mb-2 rounded-full border-2 px-4 py-2 text-[13px] font-semibold transition-colors ${selected ? 'border-magenta bg-magenta text-white' : 'border-line bg-white text-ink hover:border-magenta/40'}`}>
    {label}
  </button>
);
