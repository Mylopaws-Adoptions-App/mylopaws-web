'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/shop/Header';
import { useShop } from '@/components/shop/ShopProvider';
import { useMylo } from '@/components/shop/MyloChat';
import { Badges, Price, ProductImage } from '@/components/shop/Product';
import { EmptyState } from '@/components/design';
import { PRODUCT_COLS, inr, toProduct } from '@/lib/shop';

// Amazon-style cart: subtotal + Proceed to Buy on top, then items with qty and delete.
export default function CartPage() {
  const router = useRouter();
  const { cart, count, subtotal, setQty, delivery } = useShop();
  const { openMylo } = useMylo();
  const refreshed = useRef(false);

  // Re-read prices and stock once so the cart never shows stale numbers.
  useEffect(() => {
    if (refreshed.current || !cart.length) return;
    refreshed.current = true;
    supabase.from('shop_products').select(PRODUCT_COLS).in('handle', cart.map((l) => l.handle)).then(({ data }) => {
      for (const row of data ?? []) { const p = toProduct(row); const l = cart.find((x) => x.handle === p.handle); if (l) setQty(p, l.qty); }
    });
  }, [cart, setQty]);

  const gap = delivery.free_min - subtotal;
  const blocked = cart.some((l) => l.product.vaccine || !l.product.in_stock);

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-surface-alt pb-28">
      <Header categories={false} />
      {!cart.length ? (
        <div className="m-3 rounded-[10px] bg-white p-4 shadow-card">
          <EmptyState emoji="🛒" title="Your Mylopaws Cart is empty" sub="Search for what your pet needs, or ask Mylo." action={{ label: 'Shop today’s deals', onClick: () => router.push('/s?k=deals&sort=save') }} />
        </div>
      ) : (
        <div className="space-y-3 p-3">
          <section className="rounded-[10px] bg-white p-4 shadow-card">
            <p className="text-[18px] text-ink">Subtotal <b>{inr(subtotal)}</b></p>
            {gap > 0 ? (
              <>
                <p className="mt-1 text-[13px] text-body">Add <b>{inr(gap)}</b> of eligible items for <b className="text-success">FREE delivery</b> (otherwise {inr(delivery.fee)}), or pick up free in HSR Layout.</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-success" style={{ width: `${Math.min(100, (subtotal / delivery.free_min) * 100)}%` }} /></div>
                <button type="button" onClick={() => openMylo({ prompt: `Suggest something genuinely useful for my pet to add so I reach ${inr(delivery.free_min)} for free delivery` })} className="mt-2 text-[12px] font-semibold text-plum underline">Ask Mylo for a useful add-on</button>
              </>
            ) : <p className="mt-1 text-[13px] text-success">✔ Your order qualifies for <b>FREE delivery</b>.</p>}
            <button type="button" disabled={blocked} onClick={() => router.push('/checkout')}
              className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-full bg-butter text-[15px] font-bold text-ink disabled:opacity-50">
              Proceed to Buy ({count} item{count > 1 ? 's' : ''})
            </button>
            {blocked && <p className="mt-2 text-[12px] text-danger">Remove the unavailable items below to continue.</p>}
          </section>

          <section className="rounded-[10px] bg-white px-4 shadow-card">
            {cart.map((l) => (
              <div key={l.handle} className="border-b border-line py-3 last:border-0">
                <div className="flex gap-3">
                  <Link href={`/p/${l.handle}`} className="w-[30%] shrink-0"><ProductImage p={l.product} className="aspect-square w-full" sizes="140px" /></Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/p/${l.handle}`} className="line-clamp-2 text-[14px] leading-[1.35] text-ink">{l.product.title}</Link>
                    <div className="mt-1"><Price p={l.product} /></div>
                    <Badges p={l.product} />
                    {l.product.vaccine ? <p className="text-[12px] text-danger">Arranged by our team on WhatsApp</p>
                      : l.product.in_stock ? <p className="text-[12px] text-success">In stock</p> : <p className="text-[12px] text-danger">Currently unavailable</p>}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <label className="inline-flex h-9 items-center gap-1 rounded-[8px] border border-line bg-surface-alt px-2 text-[13px]">
                    Qty:
                    <select value={l.qty} onChange={(e) => setQty(l.product, Number(e.target.value))} aria-label={`Quantity of ${l.product.title}`} className="bg-transparent font-semibold outline-none">
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={() => setQty(l.product, 0)} className="h-9 rounded-[8px] border border-line px-3 text-[13px] text-body">Delete</button>
                  <button type="button" onClick={() => openMylo({ prompt: 'Is there a better or cheaper alternative?', product: { handle: l.handle, title: l.product.title } })} className="h-9 rounded-[8px] border border-line px-3 text-[13px] text-body">Alternatives</button>
                  <span className="ml-auto text-[14px] font-bold text-ink">{inr(l.qty * l.product.price)}</span>
                </div>
              </div>
            ))}
          </section>
          <p className="px-1 text-[12px] text-muted">Prices are re-checked when you place the order. Delivery within Bangalore only.</p>
        </div>
      )}
    </div>
  );
}
