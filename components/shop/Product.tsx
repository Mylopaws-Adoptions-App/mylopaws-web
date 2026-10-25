'use client';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus, Trash2, MessageCircle, Truck } from 'lucide-react';
import { useShop } from './ShopProvider';
import { Product, inr } from '@/lib/shop';
import { catIcon } from './ui';

/** Product photo on a soft neutral tile; falls back to the category's line icon. */
export function ProductImage({ p, className = '', sizes = '160px', priority }: { p: Product; className?: string; sizes?: string; priority?: boolean }) {
  const c = catIcon(p.category);
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#F5F2F4] ${className}`}>
      {p.image_url ? (
        <Image src={p.image_url} alt={p.title} fill sizes={sizes} priority={priority} className="object-contain p-3 mix-blend-multiply" />
      ) : (
        <div className="flex h-full w-full items-center justify-center" style={{ color: c.fg }} aria-hidden><c.Icon className="h-1/3 w-1/3" strokeWidth={1.5} /></div>
      )}
    </div>
  );
}

/** ₹1,701  ₹2,200 (struck)  23% off */
export function Price({ p, size = 'md', compact }: { p: Product; size?: 'md' | 'lg'; compact?: boolean }) {
  const lg = size === 'lg';
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5">
      <span className={`${lg ? 'text-[26px]' : 'text-[15px]'} font-bold tracking-tight text-ink`}>₹{Math.round(p.price).toLocaleString('en-IN')}</span>
      {p.mrp > p.price && <span className={`${lg ? 'text-[14px]' : 'text-[11.5px]'} text-muted line-through`}>₹{Math.round(p.mrp).toLocaleString('en-IN')}</span>}
      {p.save_pct > 0 && !compact && <span className={`${lg ? 'text-[14px]' : 'text-[11.5px]'} font-semibold text-success`}>{p.save_pct}% off</span>}
    </div>
  );
}

export function Badges({ p }: { p: Product }) {
  if (!p.rx && !p.vaccine && p.in_stock) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {p.rx && <span className="rounded-md bg-plum-soft px-1.5 py-0.5 text-[10px] font-semibold text-plum">Rx needed</span>}
      {p.vaccine && <span className="rounded-md bg-plum-soft px-1.5 py-0.5 text-[10px] font-semibold text-plum">Via our team</span>}
      {!p.in_stock && <span className="rounded-md bg-[#EEE] px-1.5 py-0.5 text-[10px] font-semibold text-muted">Out of stock</span>}
    </div>
  );
}

const spring = { type: 'spring', stiffness: 420, damping: 32 } as const;

/**
 * Add control. `variant="fab"` is the floating + on a product photo (Blinkit / Instamart style);
 * the default is an inline pill. Both morph into a − qty + stepper once the item is in the cart.
 */
export function AddControl({ p, full, variant = 'pill' }: { p: Product; full?: boolean; variant?: 'pill' | 'fab' }) {
  const { qtyOf, setQty, support } = useShop();
  const q = qtyOf(p.handle);
  const fab = variant === 'fab';
  const h = fab ? 'h-9' : 'h-10';

  if (p.vaccine) {
    if (fab) return null;
    return (
      <a href={`https://wa.me/${support}?text=${encodeURIComponent(`Hi Mylopaws! I'd like ${p.title}`)}`} target="_blank" rel="noreferrer"
        className={`inline-flex ${h} items-center justify-center gap-1.5 rounded-full border border-plum/30 px-4 text-[13px] font-semibold text-plum ${full ? 'w-full' : ''}`}>
        <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
      </a>
    );
  }
  if (!p.in_stock) {
    if (fab) return null;
    return <span className={`inline-flex ${h} items-center justify-center rounded-full bg-[#EEE] px-4 text-[13px] font-semibold text-muted ${full ? 'w-full' : ''}`}>Out of stock</span>;
  }

  return (
    <AnimatePresence initial={false} mode="popLayout">
      {q === 0 ? (
        <motion.button key="add" type="button" layout transition={spring} whileTap={{ scale: 0.92 }}
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
          onClick={(e) => { e.preventDefault(); setQty(p, 1); }} aria-label={`Add ${p.title} to cart`}
          className={fab
            ? 'flex h-9 w-9 items-center justify-center rounded-full border border-plum/15 bg-white text-plum shadow-[0_2px_10px_rgba(17,17,17,0.12)]'
            : `inline-flex ${h} items-center justify-center gap-1.5 rounded-full bg-plum px-5 text-[14px] font-semibold text-white ${full ? 'w-full' : ''}`}>
          <Plus className={fab ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={2.5} />{!fab && 'Add'}
        </motion.button>
      ) : (
        <motion.div key="step" layout transition={spring}
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
          onClick={(e) => e.preventDefault()}
          className={`inline-flex ${h} items-center justify-between rounded-full bg-plum text-white ${fab ? 'w-[96px] shadow-[0_2px_10px_rgba(107,26,71,0.35)]' : full ? 'w-full' : 'w-[112px]'}`}>
          <button type="button" onClick={() => setQty(p, q - 1)} aria-label={q === 1 ? 'Remove' : 'One less'} className={`flex ${h} w-9 items-center justify-center`}>
            {q === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" strokeWidth={2.5} />}
          </button>
          <motion.span key={q} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-[14px] font-bold" aria-live="polite">{q}</motion.span>
          <button type="button" onClick={() => setQty(p, q + 1)} aria-label="One more" className={`flex ${h} w-9 items-center justify-center`}><Plus className="h-4 w-4" strokeWidth={2.5} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Image-first product card: photo with discount tag and floating +, then title and price. */
export function ProductTile({ p, priority, tag }: { p: Product; priority?: boolean; tag?: string }) {
  return (
    <div className="flex flex-col">
      <div className="relative">
        <Link href={`/p/${p.handle}`} className="block"><ProductImage p={p} className="aspect-square w-full" priority={priority} /></Link>
        {tag ? <span className="absolute left-2 top-2 rounded-md bg-butter px-1.5 py-0.5 text-[10px] font-bold text-ink">{tag}</span>
          : p.save_pct >= 5 && <span className="absolute left-2 top-2 rounded-md bg-success px-1.5 py-0.5 text-[10px] font-bold text-white">{p.save_pct}% OFF</span>}
        {p.rx && <span className="absolute right-2 top-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-plum">Rx</span>}
        <div className="absolute bottom-2 right-2"><AddControl p={p} variant="fab" /></div>
      </div>
      <Link href={`/p/${p.handle}`} className="mt-2 line-clamp-2 min-h-[36px] text-[12.5px] font-medium leading-[1.4] text-ink">{p.title}</Link>
      <div className="mt-1"><Price p={p} compact /></div>
      {!p.in_stock && <p className="text-[11px] text-muted">Out of stock</p>}
    </div>
  );
}

/** Compact horizontal row (chat answers). */
export function ProductRow({ p, children }: { p: Product; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#EEE7EB] bg-white p-2.5">
      <Link href={`/p/${p.handle}`} className="shrink-0"><ProductImage p={p} className="h-[68px] w-[68px] rounded-xl" sizes="72px" /></Link>
      <div className="min-w-0 flex-1">
        <Link href={`/p/${p.handle}`} className="line-clamp-2 text-[13px] font-medium leading-[1.35] text-ink">{p.title}</Link>
        <div className="mt-1"><Price p={p} /></div>
        <div className="mt-0.5"><Badges p={p} /></div>
      </div>
      <div className="shrink-0">{children ?? <AddControl p={p} />}</div>
    </div>
  );
}

/** Delivery line with a truck icon. */
export function DeliveryLine({ p }: { p: Product }) {
  const { delivery, nextRun } = useShop();
  if (!p.in_stock || p.vaccine) return null;
  const when = nextRun || 'on the next run';
  return (
    <p className="flex items-center gap-1.5 text-[12px] text-body">
      <Truck className="h-3.5 w-3.5 shrink-0 text-success" />
      {p.price >= delivery.free_min ? <span><b className="text-success">Free delivery</b> {when}</span> : <span>Arrives <b>{when}</b></span>}
    </p>
  );
}

/** Search/listing result: photo left, details right. */
export function ResultRow({ p, priority }: { p: Product; priority?: boolean }) {
  return (
    <div className="flex gap-3 border-b border-[#F0EAEE] py-3.5 last:border-0">
      <Link href={`/p/${p.handle}`} className="relative w-[36%] shrink-0">
        <ProductImage p={p} className="aspect-square w-full" sizes="180px" priority={priority} />
        {p.save_pct >= 5 && <span className="absolute left-1.5 top-1.5 rounded-md bg-success px-1.5 py-0.5 text-[10px] font-bold text-white">{p.save_pct}% OFF</span>}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/p/${p.handle}`} className="line-clamp-2 text-[14px] font-medium leading-[1.4] text-ink">{p.title}</Link>
        <div className="mt-1"><Badges p={p} /></div>
        <div className="mt-1"><Price p={p} /></div>
        <div className="mt-1"><DeliveryLine p={p} /></div>
        <div className="mt-auto pt-2"><AddControl p={p} /></div>
      </div>
    </div>
  );
}

export { inr };
