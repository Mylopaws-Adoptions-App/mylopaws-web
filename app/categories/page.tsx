'use client';
import Link from 'next/link';
import Header from '@/components/shop/Header';
import { useMylo } from '@/components/shop/MyloChat';
import { CATEGORIES, PROBLEMS } from '@/lib/shop';

export default function Categories() {
  const { openMylo } = useMylo();
  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-surface-alt pb-28">
      <Header categories={false} />
      <div className="space-y-3 p-3">
        <section className="rounded-[10px] bg-white p-3 shadow-card">
          <h1 className="text-[18px] font-bold text-ink">Shop by category</h1>
          <div className="mt-2 divide-y divide-line">
            {CATEGORIES.map((c) => (
              <Link key={c.name} href={`/s?c=${encodeURIComponent(c.name)}`} className="flex min-h-[56px] items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-plum-soft text-[20px]" aria-hidden>{c.emoji}</span>
                <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold text-ink">{c.name}</span><span className="block text-[12px] text-muted">{c.blurb}</span></span>
                <span className="text-muted">›</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="rounded-[10px] bg-white p-3 shadow-card">
          <h2 className="text-[16px] font-bold text-ink">Shop by concern</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PROBLEMS.map((p) => (
              <Link key={p.label} href={`/s?k=${encodeURIComponent(p.prompt)}`} className="flex min-h-[52px] items-center gap-2 rounded-[10px] border border-line px-3 text-[13px] font-semibold text-ink">
                <span className="text-[20px]" aria-hidden>{p.emoji}</span>{p.label}
              </Link>
            ))}
          </div>
          <button type="button" onClick={() => openMylo()} className="mt-3 w-full rounded-full bg-plum py-3 text-[14px] font-bold text-white">Describe it to Mylo</button>
        </section>
      </div>
    </div>
  );
}
