'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, MessageCircle, Repeat, ShoppingBag, Sparkles, Store, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/shop/Header';
import { useShop } from '@/components/shop/ShopProvider';
import { useMylo } from '@/components/shop/MyloChat';
import { AddControl, Badges, Price, ProductImage } from '@/components/shop/Product';
import { PRODUCT_COLS, inr, toProduct } from '@/lib/shop';

// Cart: free-delivery progress, item cards with steppers, sticky Checkout bar above the tab bar.
export default function CartPage() {
  const router = useRouter();
  const { cart, count, subtotal, setQty, delivery, nextRun } = useShop();
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
  const mrpTotal = cart.reduce((s, l) => s + l.qty * Math.max(l.product.mrp, l.product.price), 0);
  const saved = Math.round(mrpTotal - subtotal);

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#FAF8F9] pb-48">
      <Header />
      {!cart.length ? (
        <div className="flex flex-col items-center px-8 pt-16 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-plum-soft text-plum"><ShoppingBag className="h-9 w-9" strokeWidth={1.6} /></span>
          <h1 className="mt-4 text-[18px] font-bold text-ink">Your cart is empty</h1>
          <p className="mt-1 text-[13px] text-muted">Search for what your pet needs, or tell Mylo what’s going on.</p>
          <button type="button" onClick={() => router.push('/s?k=deals&sort=save')} className="mt-5 h-12 w-full rounded-full bg-plum text-[14px] font-semibold text-white">Shop today’s deals</button>
          <button type="button" onClick={() => openMylo()} className="mt-2 flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-plum-soft text-[14px] font-semibold text-plum"><Sparkles className="h-4 w-4" />Ask Mylo</button>
        </div>
      ) : (
        <div className="space-y-3 px-4 pt-4">
          <div className="flex items-baseline justify-between">
            <h1 className="text-[20px] font-bold tracking-tight text-ink">Cart <span className="text-[14px] font-medium text-muted">· {count} item{count > 1 ? 's' : ''}</span></h1>
            {saved > 0 && <span className="rounded-full bg-success/10 px-2.5 py-1 text-[12px] font-semibold text-success">Saving {inr(saved)}</span>}
          </div>

          {/* Delivery progress */}
          <section className="rounded-2xl border border-[#EEE7EB] bg-white p-3.5">
            <div className="flex items-center gap-2.5">
              <Truck className="h-5 w-5 shrink-0 text-success" />
              {gap > 0
                ? <p className="text-[13px] text-body">Add <b className="font-semibold text-ink">{inr(gap)}</b> more for <b className="font-semibold text-success">free delivery</b></p>
                : <p className="text-[13px] font-semibold text-success">You’ve unlocked free delivery</p>}
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#F0EAEE]"><div className="h-full rounded-full bg-success transition-all" style={{ width: `${Math.min(100, (subtotal / delivery.free_min) * 100)}%` }} /></div>
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted"><Store className="h-3.5 w-3.5" />Arrives {nextRun || 'on the next run'}, {delivery.window} · or pick up free in HSR</p>
            {gap > 0 && (
              <button type="button" onClick={() => openMylo({ prompt: `Suggest something genuinely useful for my pet to add so I reach ${inr(delivery.free_min)} for free delivery` })}
                className="mt-2 flex items-center gap-1 text-[12.5px] font-semibold text-plum"><Sparkles className="h-3.5 w-3.5" />Ask Mylo for a useful add-on</button>
            )}
          </section>

          {/* Items */}
          <section className="divide-y divide-[#F3EEF1] rounded-2xl border border-[#EEE7EB] bg-white">
            {cart.map((l) => (
              <div key={l.handle} className="flex gap-3 p-3">
                <Link href={`/p/${l.handle}`} className="w-[84px] shrink-0"><ProductImage p={l.product} className="aspect-square w-full rounded-xl" sizes="90px" /></Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/p/${l.handle}`} className="line-clamp-2 text-[13.5px] font-medium leading-snug text-ink">{l.product.title}</Link>
                  <div className="mt-1"><Price p={l.product} /></div>
                  <Badges p={l.product} />
                  {l.product.vaccine && <p className="mt-0.5 flex items-center gap-1 text-[12px] text-danger"><MessageCircle className="h-3.5 w-3.5" />Arranged by our team on WhatsApp. Remove to continue.</p>}
                  {!l.product.vaccine && !l.product.in_stock && <p className="mt-0.5 text-[12px] text-danger">Unavailable. Remove to continue.</p>}
                  <div className="mt-2 flex items-center gap-2">
                    {l.product.in_stock && !l.product.vaccine
                      ? <AddControl p={l.product} />
                      : <button type="button" onClick={() => setQty(l.product, 0)} className="h-9 rounded-full border border-[#E6DDE2] px-4 text-[13px] font-medium text-body">Remove</button>}
                    <button type="button" onClick={() => openMylo({ prompt: 'Is there a better or cheaper alternative?', product: { handle: l.handle, title: l.product.title } })}
                      className="flex h-9 items-center gap-1 rounded-full px-2 text-[12px] font-medium text-plum"><Repeat className="h-3.5 w-3.5" />Alternatives</button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Bill */}
          <section className="space-y-1.5 rounded-2xl border border-[#EEE7EB] bg-white p-3.5 text-[13px] text-body">
            <div className="flex justify-between"><span>Items (M.R.P.)</span><span>{inr(mrpTotal)}</span></div>
            {saved > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>−{inr(saved)}</span></div>}
            <div className="flex justify-between"><span>Delivery</span><span>{gap > 0 ? `${inr(delivery.fee)} or free pickup` : <span className="text-success">Free</span>}</span></div>
            <div className="flex justify-between border-t border-[#F3EEF1] pt-2 text-[15px] font-semibold text-ink"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
          </section>
          <p className="px-1 text-[11.5px] text-muted">Prices are re-checked when you place the order. Delivery within Bangalore only.</p>
        </div>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-[calc(61px+env(safe-area-inset-bottom))] left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-[#EEE7EB] bg-white/95 px-4 py-2.5 backdrop-blur">
          <button type="button" disabled={blocked} onClick={() => router.push('/checkout')}
            className="flex h-12 w-full items-center justify-between rounded-full bg-plum pl-5 pr-2 text-white disabled:opacity-50">
            <span className="text-left leading-tight"><span className="block text-[15px] font-bold">{inr(subtotal)}</span><span className="block text-[11px] text-white/70">{count} item{count > 1 ? 's' : ''}{saved > 0 ? ` · saved ${inr(saved)}` : ''}</span></span>
            <span className="flex h-9 items-center gap-1 rounded-full bg-butter px-4 text-[14px] font-semibold text-ink">Checkout<ArrowRight className="h-4 w-4" /></span>
          </button>
          {blocked && <p className="mt-1 text-center text-[11.5px] text-danger">Remove the unavailable items to continue.</p>}
        </div>
      )}
    </div>
  );
}
