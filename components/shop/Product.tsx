'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useShop } from './ShopProvider';
import { Product, categoryEmoji, inr } from '@/lib/shop';

/** Product image in a rounded white tile; falls back to the category emoji. */
export function ProductImage({ p, className = '', sizes = '160px', priority }: { p: Product; className?: string; sizes?: string; priority?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-[14px] bg-surface-alt text-[0px] ${className}`}>
      {p.image_url ? (
        <Image src={p.image_url} alt={p.title} fill sizes={sizes} priority={priority} className="object-contain p-2 mix-blend-multiply" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-4xl" aria-hidden>{categoryEmoji(p.category)}</div>
      )}
    </div>
  );
}

export function Price({ p, size = 'md' }: { p: Product; size?: 'md' | 'lg' }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5">
      <span className={`${size === 'lg' ? 'text-[26px]' : 'text-[15px]'} font-extrabold text-ink`}>{inr(p.price)}</span>
      {p.mrp > p.price && <span className={`${size === 'lg' ? 'text-[15px]' : 'text-[12px]'} text-muted line-through`}>{inr(p.mrp)}</span>}
      {p.save_pct > 0 && <span className={`${size === 'lg' ? 'text-[14px]' : 'text-[11px]'} font-bold text-success`}>{p.save_pct}% off</span>}
    </div>
  );
}

export function Badges({ p }: { p: Product }) {
  if (!p.rx && !p.vaccine && p.in_stock) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {p.rx && <span className="rounded-full bg-plum-soft px-2 py-0.5 text-[10px] font-bold text-plum">Rx needed</span>}
      {p.vaccine && <span className="rounded-full bg-plum-soft px-2 py-0.5 text-[10px] font-bold text-plum">Via our team</span>}
      {!p.in_stock && <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-bold text-muted">Out of stock</span>}
    </div>
  );
}

/** Add button that turns into a − qty + stepper. Vaccines route to WhatsApp; out-of-stock is disabled. */
export function AddControl({ p, full }: { p: Product; full?: boolean }) {
  const { qtyOf, setQty, support } = useShop();
  const q = qtyOf(p.handle);
  const w = full ? 'w-full' : '';
  if (p.vaccine) {
    return (
      <a href={`https://wa.me/${support}?text=${encodeURIComponent(`Hi Mylopaws! I'd like ${p.title}`)}`} target="_blank" rel="noreferrer"
        className={`inline-flex h-10 items-center justify-center rounded-full border-[1.5px] border-plum px-4 text-[13px] font-bold text-plum ${w}`}>
        Ask on WhatsApp
      </a>
    );
  }
  if (!p.in_stock) {
    return <span className={`inline-flex h-10 items-center justify-center rounded-full bg-[#DEDEDE] px-4 text-[13px] font-bold text-[#9A9A9A] ${w}`}>Out of stock</span>;
  }
  if (q === 0) {
    return (
      <button type="button" onClick={() => setQty(p, 1)} aria-label={`Add ${p.title}`}
        className={`inline-flex h-10 items-center justify-center rounded-full bg-plum px-5 text-[14px] font-bold text-white transition active:scale-95 ${w}`}>
        Add
      </button>
    );
  }
  return (
    <div className={`inline-flex h-10 items-center justify-between rounded-full bg-plum text-white ${full ? 'w-full' : 'min-w-[104px]'}`}>
      <button type="button" onClick={() => setQty(p, q - 1)} aria-label="One less" className="h-10 w-10 text-[20px] font-bold">−</button>
      <span className="text-[15px] font-bold" aria-live="polite">{q}</span>
      <button type="button" onClick={() => setQty(p, q + 1)} aria-label="One more" className="h-10 w-10 text-[20px] font-bold">+</button>
    </div>
  );
}

/** Grid tile (Shop, Home rows). */
export function ProductTile({ p, priority }: { p: Product; priority?: boolean }) {
  return (
    <div className="flex flex-col rounded-card border border-line bg-white p-2.5 shadow-card">
      <Link href={`/p/${p.handle}`} className="block">
        <ProductImage p={p} className="aspect-square w-full" priority={priority} />
        <div className="mt-2 min-h-[18px]"><Badges p={p} /></div>
        <p className="mt-1 line-clamp-2 min-h-[38px] text-[13px] font-semibold leading-[1.4] text-ink">{p.title}</p>
      </Link>
      <div className="mt-1.5"><Price p={p} /></div>
      <div className="mt-2"><AddControl p={p} full /></div>
    </div>
  );
}

/** Compact horizontal row (chat answers, cart, refills). */
export function ProductRow({ p, children }: { p: Product; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-white p-2.5 shadow-card">
      <Link href={`/p/${p.handle}`} className="shrink-0"><ProductImage p={p} className="h-[72px] w-[72px]" sizes="72px" /></Link>
      <div className="min-w-0 flex-1">
        <Link href={`/p/${p.handle}`} className="line-clamp-2 text-[13px] font-semibold leading-[1.35] text-ink">{p.title}</Link>
        <div className="mt-1"><Price p={p} /></div>
        <div className="mt-1"><Badges p={p} /></div>
      </div>
      <div className="shrink-0">{children ?? <AddControl p={p} />}</div>
    </div>
  );
}
