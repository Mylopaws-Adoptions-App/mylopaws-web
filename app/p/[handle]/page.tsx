'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { MAX_QTY, PRODUCT_COLS, Product, inr, toProduct } from '@/lib/shop';
import Header from '@/components/shop/Header';
import { useShop } from '@/components/shop/ShopProvider';
import { useMylo } from '@/components/shop/MyloChat';
import { Badges, Price, ProductImage, ProductTile } from '@/components/shop/Product';
import { EmptyState, Skeleton } from '@/components/design';
import { ChevronRight, MessageCircle, Minus, Plus, ShieldCheck, Sparkles, Store, Truck, RotateCcw, FileText } from 'lucide-react';
import { catIcon } from '@/components/shop/ui';
import { toast } from '@/lib/toast';

// Amazon-style product page: image, price block, delivery, stock, qty, Add to Cart / Buy Now, Mylo Q&A.
export default function ProductPage() {
  const { handle } = useParams<{ handle: string }>();
  const router = useRouter();
  const { qtyOf, setQty, support, nextRun, delivery } = useShop();
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

  const inCart = p ? qtyOf(p.handle) : 0;
  const buyable = !!p && p.in_stock && !p.vaccine;

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#FAF8F9] pb-32">
      <Header back />
      {p === undefined ? (
        <div className="p-4"><Skeleton className="aspect-square w-full rounded-3xl" /><Skeleton className="mt-4 h-5 w-3/4" /><Skeleton className="mt-3 h-8 w-1/3" /></div>
      ) : p === null ? (
        <EmptyState emoji="🐾" title="Product not found" sub="It may have been removed." action={{ label: 'Back to shopping', onClick: () => router.push('/') }} />
      ) : (
        <div className="mp-fade">
          <div className="relative mx-4 mt-4">
            <ProductImage p={p} className="aspect-square w-full rounded-3xl !bg-white" sizes="(max-width: 480px) 100vw, 480px" priority />
            {p.save_pct >= 5 && <span className="absolute left-3 top-3 rounded-lg bg-success px-2 py-1 text-[11px] font-bold text-white">{p.save_pct}% OFF</span>}
          </div>

          <div className="px-4 pt-4">
            <Link href={`/s?c=${encodeURIComponent(p.category)}`} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
              style={{ background: catIcon(p.category).tint, color: catIcon(p.category).fg }}>{p.category}<ChevronRight className="h-3 w-3" /></Link>
            <h1 className="mt-2 text-[17px] font-semibold leading-snug tracking-tight text-ink">{p.title}</h1>
            <div className="mt-2"><Price p={p} size="lg" /></div>
            <p className="text-[11.5px] text-muted">Inclusive of all taxes</p>
            <div className="mt-2"><Badges p={p} /></div>
          </div>

          {p.rx && (
            <div className="mx-4 mt-3 flex gap-2.5 rounded-2xl bg-plum-soft p-3 text-[12.5px] leading-snug text-plum">
              <FileText className="h-5 w-5 shrink-0" />
              <p><b className="font-semibold">Prescription needed.</b> Upload a photo or PDF of your vet’s prescription at checkout. We check it before packing.</p>
            </div>
          )}

          {/* Delivery & trust */}
          <div className="mx-4 mt-3 divide-y divide-[#F3EEF1] rounded-2xl border border-[#EEE7EB] bg-white">
            {p.vaccine ? (
              <div className="flex gap-3 p-3 text-[13px] text-body"><MessageCircle className="h-5 w-5 shrink-0 text-plum" /><p>Vaccines need cold-chain handling, so our team arranges them with you on WhatsApp.</p></div>
            ) : !p.in_stock ? (
              <div className="p-3 text-[14px] font-semibold text-danger">Currently unavailable</div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3">
                  <Truck className="h-5 w-5 shrink-0 text-success" />
                  <div className="text-[13px] text-body"><b className="font-semibold text-ink">Arrives {nextRun || 'on the next run'}</b>, {delivery.window}<br />
                    <span className="text-[12px] text-muted">{p.price >= delivery.free_min ? 'Free delivery' : `Free delivery on orders over ${inr(delivery.free_min)}`}</span></div>
                </div>
                <div className="flex items-center gap-3 p-3 text-[13px] text-body"><Store className="h-5 w-5 shrink-0 text-plum" />Or pick up free from our HSR Layout store</div>
              </>
            )}
            <div className="flex items-center gap-3 p-3 text-[12.5px] text-muted"><ShieldCheck className="h-5 w-5 shrink-0 text-success" />Genuine, from a licensed pet pharmacy</div>
            <div className="flex items-center gap-3 p-3 text-[12.5px] text-muted"><RotateCcw className="h-5 w-5 shrink-0 text-success" />Cancel before packing for a full refund</div>
          </div>

          {/* Mylo Q&A */}
          <section className="mx-4 mt-3 rounded-2xl bg-gradient-to-br from-[#F7EEF3] to-[#FFF8E1] p-3.5 ring-1 ring-plum/10">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-plum"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-plum text-butter"><Sparkles className="h-3.5 w-3.5" /></span>Ask Mylo about this</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {['Is this right for my pet?', 'How is it used?', 'Cheaper alternatives?'].map((q) => (
                <button key={q} type="button" onClick={() => ask(q)} className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-plum ring-1 ring-plum/10">{q}</button>
              ))}
              <button type="button" onClick={() => ask()} className="rounded-full bg-plum px-3 py-1.5 text-[12px] font-medium text-white">Ask something else</button>
            </div>
          </section>

          {desc && (
            <section className="mx-4 mt-3 rounded-2xl border border-[#EEE7EB] bg-white p-3.5">
              <h2 className="text-[15px] font-semibold text-ink">About this item</h2>
              <p className={`mt-1.5 text-[13.5px] leading-[1.6] text-body ${more ? '' : 'line-clamp-5'}`}>{desc}</p>
              {desc.length > 260 && <button type="button" onClick={() => setMore((m) => !m)} className="mt-1 text-[13px] font-semibold text-plum">{more ? 'Show less' : 'Read more'}</button>}
              <p className="mt-2 text-[11.5px] leading-[1.5] text-muted">Always follow your vet’s advice and the pack instructions.</p>
            </section>
          )}

          {similar.length > 0 && (
            <section className="pt-6">
              <h2 className="px-4 text-[16px] font-bold tracking-tight text-ink">You may also like</h2>
              <div className="mt-3 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {similar.map((s) => <div key={s.handle} className="w-[138px] shrink-0"><ProductTile p={s} /></div>)}
              </div>
            </section>
          )}

          {/* Sticky buy bar */}
          <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-[#EEE7EB] bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5 backdrop-blur">
            {p.vaccine ? (
              <a href={`https://wa.me/${support}?text=${encodeURIComponent(`Hi Mylopaws! I'd like ${p.title}`)}`} target="_blank" rel="noreferrer"
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-success text-[15px] font-semibold text-white"><MessageCircle className="h-5 w-5" />Order on WhatsApp</a>
            ) : !buyable ? (
              <button type="button" onClick={() => ask('Suggest an in-stock alternative')} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-plum text-[15px] font-semibold text-white"><Sparkles className="h-4 w-4 text-butter" />Find an alternative with Mylo</button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-12 items-center rounded-full border border-[#E6DDE2]">
                  <button type="button" onClick={() => setQ(Math.max(1, qty - 1))} aria-label="One less" className="flex h-12 w-10 items-center justify-center text-ink"><Minus className="h-4 w-4" /></button>
                  <span className="w-5 text-center text-[15px] font-semibold" aria-live="polite">{qty}</span>
                  <button type="button" onClick={() => setQ(Math.min(10, qty + 1))} aria-label="One more" className="flex h-12 w-10 items-center justify-center text-ink"><Plus className="h-4 w-4" /></button>
                </div>
                <button type="button" onClick={() => add(false)} className="flex h-12 flex-1 items-center justify-center rounded-full border-[1.5px] border-plum text-[14px] font-semibold text-plum active:scale-[0.98]">
                  {inCart ? `In cart (${inCart}) +` : 'Add to cart'}
                </button>
                <button type="button" onClick={() => add(true)} className="flex h-12 flex-1 items-center justify-center rounded-full bg-plum text-[14px] font-semibold text-white active:scale-[0.98]">Buy now</button>
              </div>
            )}
            {inCart > 0 && buyable && <Link href="/cart" className="mt-1.5 block text-center text-[12px] font-semibold text-plum">Go to cart · {inCart} of this</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
