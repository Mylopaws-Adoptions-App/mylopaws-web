'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PRODUCT_COLS, Product, inr, toProduct } from '@/lib/shop';
import { useShop } from '@/components/shop/ShopProvider';
import { AddControl, Badges, Price, ProductImage, ProductTile } from '@/components/shop/Product';
import AskBar from '@/components/shop/AskBar';
import { EmptyState, Icons, Portal, Skeleton } from '@/components/design';
import { track } from '@/lib/analytics';

export default function ProductPage() {
  const { handle } = useParams<{ handle: string }>();
  const router = useRouter();
  const { delivery, nextRun, qtyOf } = useShop();
  const [p, setP] = useState<Product | null | undefined>(undefined);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [more, setMore] = useState(false);

  useEffect(() => {
    supabase.from('shop_products').select(PRODUCT_COLS).eq('handle', handle).maybeSingle().then(({ data }) => {
      const prod = data ? toProduct(data) : null;
      setP(prod);
      if (!prod) return;
      track('view_item', { item: prod.handle, value: prod.price });
      supabase.from('shop_products').select(PRODUCT_COLS).eq('category', prod.category).eq('available', true).eq('in_stock', true).neq('handle', prod.handle).limit(8)
        .then(({ data: d }) => setSimilar((d ?? []).map(toProduct)));
    });
  }, [handle]);

  const back = () => (history.length > 1 ? router.back() : router.push('/shop'));
  const desc = (p?.description ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const inCart = p ? qtyOf(p.handle) : 0;

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-white pb-48">
      <div className="sticky top-0 z-20 flex items-center justify-between bg-white/95 px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur">
        <button type="button" onClick={back} aria-label="Go back" className="flex h-11 w-11 items-center justify-center"><Icons.ChevronLeft className="h-6 w-6" /></button>
        <Link href="/cart" className="px-3 text-[14px] font-bold text-plum">Cart</Link>
      </div>

      {p === undefined ? (
        <div className="px-5"><Skeleton className="aspect-square w-full rounded-card" /><Skeleton className="mt-4 h-6 w-3/4" /><Skeleton className="mt-2 h-8 w-1/3" /></div>
      ) : p === null ? (
        <EmptyState emoji="🐾" title="Product not found" sub="It may have been removed." action={{ label: 'Browse the shop', onClick: () => router.push('/shop') }} />
      ) : (
        <div className="mp-fade px-5">
          <ProductImage p={p} className="aspect-square w-full" sizes="(max-width: 480px) 100vw, 480px" priority />
          <div className="mt-4"><Badges p={p} /></div>
          <p className="mt-2 text-[12px] font-semibold uppercase tracking-wide text-muted">{p.category}</p>
          <h1 className="mt-1 text-[22px] font-extrabold leading-tight text-ink">{p.title}</h1>
          <div className="mt-3"><Price p={p} size="lg" /></div>
          {p.mrp > p.price && <p className="text-[13px] text-success">You save {inr(p.mrp - p.price)} vs MRP</p>}

          <AskBar product={p.handle} placeholder="Ask Mylo about this product" className="mt-5" />

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-card bg-surface-alt p-3"><p className="text-[12px] text-muted">Delivery</p><p className="text-[13px] font-bold text-ink">{nextRun ? `Next run ${nextRun}` : 'Evening run'}, {delivery.window}</p></div>
            <div className="rounded-card bg-surface-alt p-3"><p className="text-[12px] text-muted">Free delivery</p><p className="text-[13px] font-bold text-ink">On orders over {inr(delivery.free_min)}</p></div>
          </div>

          {p.rx && (
            <div className="mt-4 rounded-card bg-plum-soft p-4 text-[13px] leading-[1.5] text-plum">
              <b>Vet prescription needed.</b> You’ll upload a photo or PDF of it at checkout. Our team checks it before packing.
            </div>
          )}
          {p.vaccine && (
            <div className="mt-4 rounded-card bg-plum-soft p-4 text-[13px] leading-[1.5] text-plum">
              Vaccines need cold-chain handling, so our team arranges them with you on WhatsApp.
            </div>
          )}

          {desc && (
            <section className="mt-6">
              <h2 className="text-[17px] font-bold text-ink">About this product</h2>
              <p className={`mt-2 text-[14px] leading-[1.6] text-body ${more ? '' : 'line-clamp-5'}`}>{desc}</p>
              {desc.length > 280 && <button type="button" onClick={() => setMore((m) => !m)} className="mt-1 text-[13px] font-bold text-plum">{more ? 'Show less' : 'Read more'}</button>}
            </section>
          )}
          <p className="mt-4 text-[12px] leading-[1.5] text-muted">Always follow your vet’s advice and the pack instructions. Questions? Ask Mylo or our team.</p>

          {similar.length > 0 && (
            <section className="mt-8">
              <h2 className="text-[17px] font-bold text-ink">Similar products</h2>
              <div className="-mx-5 mt-3 flex gap-2.5 overflow-x-auto px-5 pb-2">
                {similar.map((s) => <div key={s.handle} className="w-[158px] shrink-0"><ProductTile p={s} /></div>)}
              </div>
            </section>
          )}

          <Portal>
            <div className="fixed bottom-[calc(56px_+_env(safe-area-inset-bottom))] left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-white px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1"><Price p={p} /><p className="truncate text-[11px] text-muted">{inCart ? `${inCart} in your cart` : 'Inclusive of all taxes'}</p></div>
                <div className="w-[150px]"><AddControl p={p} full /></div>
                {inCart > 0 && <Link href="/cart" className="flex h-10 items-center rounded-full border-[1.5px] border-plum px-3 text-[13px] font-bold text-plum">Cart</Link>}
              </div>
            </div>
          </Portal>
        </div>
      )}
    </div>
  );
}
