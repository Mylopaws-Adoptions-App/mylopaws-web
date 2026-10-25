'use client';
import Link from 'next/link';
import { ChevronRight, Sparkles } from 'lucide-react';
import Header from '@/components/shop/Header';
import { useMylo } from '@/components/shop/MyloChat';
import { CATEGORIES } from '@/lib/shop';
import { STARTERS, catIcon } from '@/components/shop/ui';

export default function Categories() {
  const { openMylo } = useMylo();
  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#FAF8F9] pb-28">
      <Header />
      <div className="px-4 pt-5">
        <h1 className="text-[20px] font-bold tracking-tight text-ink">Categories</h1>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {CATEGORIES.map((c) => {
            const { Icon, tint, fg } = catIcon(c.name);
            return (
              <Link key={c.name} href={`/s?c=${encodeURIComponent(c.name)}`} className="flex flex-col gap-2.5 rounded-2xl border border-[#EEE7EB] bg-white p-3 active:scale-[0.98]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: tint, color: fg }}><Icon className="h-[22px] w-[22px]" strokeWidth={1.9} /></span>
                <span>
                  <span className="block text-[13.5px] font-semibold leading-tight text-ink">{c.name}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">{c.blurb}</span>
                </span>
              </Link>
            );
          })}
        </div>

        <h2 className="mt-7 text-[17px] font-bold tracking-tight text-ink">Shop by problem</h2>
        <p className="text-[12px] text-muted">Mylo answers and picks the right products.</p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-[#EEE7EB] bg-white">
          {STARTERS.map(({ l, prompt, Icon }) => (
            <Link key={l} href={`/s?k=${encodeURIComponent(prompt)}`} className="flex min-h-[52px] items-center gap-3 border-b border-[#F3EEF1] px-3.5 last:border-0 active:bg-[#F7F4F6]">
              <Icon className="h-[18px] w-[18px] text-plum" />
              <span className="flex-1 text-[14px] text-ink">{l}</span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          ))}
        </div>
        <button type="button" onClick={() => openMylo()} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-plum text-[14px] font-semibold text-white">
          <Sparkles className="h-4 w-4 text-butter" />Describe it to Mylo
        </button>
      </div>
    </div>
  );
}
