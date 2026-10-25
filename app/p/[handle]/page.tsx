'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { MAX_QTY, PRODUCT_COLS, Product, categoryEmoji, inr, toProduct } from '@/lib/shop';
import Header from '@/components/shop/Header';
import { useShop } from '@/components/shop/ShopProvider';
import { useMylo } from '@/components/shop/MyloChat';
import { Badges, DeliveryLine, Price, ProductImage, ProductTile } from '@/components/shop/Product';
import { EmptyState, Skeleton } from '@/components/design';
import { PawIcon } from '@/components/design/nav-icons';
import { toast } from '@/lib/toast';

// Amazon-style product page: image, price block, delivery, stock, qty, Add to Cart / Buy Now, Mylo Q&A.
export default function ProductPage() {
  const { handle } = useParams<{ handle: string }>();
  const router = useRouter();
  const { qtyOf, setQty, support } = useShop();
  const { openMylo } = useMylo();
  const [p, setP] = useState<Product | null | undefined>(undefined);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [qty, setQ] = useState(1);
  const [more, setMore] = useState(false);

  useEffect(() => {
    setP(undefined);
    supabase.from('shop_products').select(PRODUCT_COLS).eq('handle', handle).maybeSingle().then(({ data }) => {
      const prod = data ? toProduct(data) : null;
      setP(prod);
      if (!prod) return;
      track('view_item', { item: prod.handle, value: prod.price });
      supabase.from('shop_products').select(PRODUCT_COLS).eq('category', prod.category).eq('available', true).eq('in_stock', true).neq('handle', prod.handle).limit(10)
        .then(({ data: d }) => setSimilar((d ?? []).map(toProduct)));
    });
  }, [handle]);

  const ask = (prompt?: string) => p && openMylo({ prompt, product: { handle: p.handle, title: p.title } });
  const add = (thenBuy: boolean) => {
    if (!p) return;
    setQty(p, Math.min(MAX_QTY, qtyOf(p.handle) + qty));
    if (thenBuy) router.push('/checkout');
    else toast(`Added to cart`, 'success');
  };
  const desc = (p?.description ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-white pb-28">
      <Header categories={false} />
      {p === undefined ? (
        <div className="p-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="mt-3 aspect-square w-full rounded-card" /><Skeleton className="mt-3 h-8 w-1/3" /></div>
      ) : p === null ? (
        <EmptyState emoji="🐾" title="Product not found" sub="It may have been removed." action={{ label: 'Back to shopping', onClick: () => router.push('/') }} />
      ) : (
        <div className="mp-fade">
          <nav className="px-4 pt-3 text-[12px] text-plum"><Link href={`/s?c=${encodeURIComponent(p.category)}`}>{categoryEmoji(p.category)} {p.category}</Link></nav>
          <h1 className="px-4 pt-1 text-[15px] leading-[1.4] text-ink">{p.title}</h1>
          <div className="px-4 pt-3"><ProductImage p={p} className="aspect-square w-full" sizes="(max-width: 480px) 100vw, 480px" priority /></div>

          <div className="px-4 pt-4">
            <Badges p={p} />
            <div className="mt-1"><Price p={p} size="lg" /></div>
            <p className="text-[12px] text-muted">Inclusive of all taxes</p>
          </div>

          {/* Mylo Q&A (Rufus-style) */}
          <section className="mx-4 mt-4 rounded-[10px] border border-plum/20 bg-plum-soft p-3">
            <p className="flex items-center gap-2 text-[13px] font-bold text-plum"><PawIcon className="h-4 w-4" /> Ask Mylo about this product</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['Is this right for my pet?', 'How is it used?', 'Cheaper alternatives?'].map((q) => (
                <button key={q} type="button" onClick={() => ask(q)} className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-plum">{q}</button>
              ))}
              <button type="button" onClick={() => ask()} className="rounded-full bg-plum px-3 py-1.5 text-[12px] font-semibold text-white">Ask something else</button>
            </div>
          </section>

          <section className="mx-4 mt-4 rounded-[10px] border border-line p-3">
            <DeliveryLine p={p} />
            <p className="text-[12px] text-body">Or <b>FREE pickup</b> from our HSR Layout store</p>
            {p.vaccine ? (
              <>
                <p className="mt-2 text-[14px] text-body">Vaccines need cold-chain handling, so our team arranges them with you directly.</p>
                <a href={`https://wa.me/${support}?text=${encodeURIComponent(`Hi Mylopaws! I'd like ${p.title}`)}`} target="_blank" rel="noreferrer"
                  className="mt-3 flex min-h-[48px] items-center justify-center rounded-full bg-success text-[15px] font-bold text-white">Order on WhatsApp</a>
              </>
            ) : !p.in_stock ? (
              <p className="mt-2 text-[18px] text-danger">Currently unavailable.</p>
            ) : (
              <>
                <p className="mt-2 text-[18px] text-success">In stock</p>
                <p className="text-[12px] text-muted">Sold by Mylopaws · Ships from Bengaluru</p>
                {p.rx && <p className="mt-2 rounded-[8px] bg-plum-soft p-2 text-[12px] text-plum"><b>Prescription needed.</b> Upload a photo or PDF of your vet’s prescription at checkout; we check it before packing.</p>}
                <label className="mt-3 inline-flex items-center gap-2 rounded-[8px] border border-line bg-surface-alt px-3 py-2 text-[14px]">
                  Quantity:
                  <select value={qty} onChange={(e) => setQ(Number(e.target.value))} className="bg-transparent font-semibold outline-none" aria-label="Quantity">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => add(false)} className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-full bg-butter text-[15px] font-bold text-ink active:scale-[0.99]">Add to Cart</button>
                <button type="button" onClick={() => add(true)} className="mt-2 flex min-h-[48px] w-full items-center justify-center rounded-full bg-plum text-[15px] font-bold text-white active:scale-[0.99]">Buy Now</button>
                {qtyOf(p.handle) > 0 && <Link href="/cart" className="mt-2 block text-center text-[13px] font-semibold text-plum">{qtyOf(p.handle)} in your cart · Go to Cart</Link>}
              </>
            )}
            <p className="mt-3 text-[12px] text-muted">🔒 Secure payment via Razorpay · Cancel before packing for a full refund</p>
          </section>

          {desc && (
            <section className="px-4 pt-5">
              <h2 className="text-[17px] font-bold text-ink">About this item</h2>
              <p className={`mt-2 text-[14px] leading-[1.6] text-body ${more ? '' : 'line-clamp-6'}`}>{desc}</p>
              {desc.length > 300 && <button type="button" onClick={() => setMore((m) => !m)} className="mt-1 text-[13px] font-semibold text-plum">{more ? 'See less' : 'See more'}</button>}
            </section>
          )}
          <p className="px-4 pt-3 text-[12px] leading-[1.5] text-muted">Always follow your vet’s advice and the pack instructions. M.R.P. {inr(p.mrp)}.</p>

          {similar.length > 0 && (
            <section className="pt-6">
              <h2 className="px-4 text-[17px] font-bold text-ink">Customers also viewed</h2>
              <div className="mt-2 flex gap-2.5 overflow-x-auto px-4 pb-2">
                {similar.map((s) => <div key={s.handle} className="w-[150px] shrink-0"><ProductTile p={s} /></div>)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
