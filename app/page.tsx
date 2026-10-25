'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/shop/Header';
import { useShop } from '@/components/shop/ShopProvider';
import { useMylo } from '@/components/shop/MyloChat';
import { ProductImage, ProductTile } from '@/components/shop/Product';
import { CATEGORIES, PRODUCT_COLS, Product, inr, shopFn, toProduct } from '@/lib/shop';
import { Skeleton } from '@/components/design';
import { PawIcon } from '@/components/design/nav-icons';

// Amazon.in-style storefront: banners, concern cards, buy again, deals rows, categories. Mylo lives in the search bar.
const CONCERNS = [
  { title: 'Skin & coat troubles', tiles: [
    { e: '😣', l: 'Itching', k: 'my dog keeps itching and scratching' },
    { e: '❄️', l: 'Dandruff', k: 'anti dandruff shampoo for dogs' },
    { e: '🍂', l: 'Shedding', k: 'heavy shedding dull coat supplement' },
    { e: '👃', l: 'Bad smell', k: 'my dog smells even after a bath' },
  ] },
  { title: 'Everyday health', tiles: [
    { e: '🦴', l: 'Joints', k: 'joint supplement for older dog' },
    { e: '🍽️', l: 'Gut health', k: 'probiotic for upset tummy' },
    { e: '👂', l: 'Ear care', k: 'ear cleaner for dogs with smelly ears' },
    { e: '🦷', l: 'Dental', k: 'dental care for bad breath' },
  ] },
];

export default function Home() {
  const { session, pet, delivery, nextRun } = useShop();
  const { openMylo } = useMylo();
  const [all, setAll] = useState<Product[] | null>(null);
  const [again, setAgain] = useState<{ p: Product; due: boolean }[]>([]);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    supabase.from('shop_products').select(PRODUCT_COLS).eq('available', true).eq('in_stock', true).limit(400)
      .then(({ data }) => setAll((data ?? []).map(toProduct).filter((p) => p.image_url && !p.vaccine)));
  }, []);

  useEffect(() => {
    if (!session) { setAgain([]); return; }
    shopFn<{ orders: { items: { handle: string }[]; payment_status: string; created_at: string }[] }>('orders').then(async ({ orders }) => {
      const last = new Map<string, string>();
      for (const o of orders.filter((x) => x.payment_status === 'paid')) for (const it of o.items ?? []) if (it.handle && !last.has(it.handle)) last.set(it.handle, o.created_at);
      if (!last.size) return;
      const { data } = await supabase.from('shop_products').select(PRODUCT_COLS).in('handle', Array.from(last.keys()).slice(0, 12));
      setAgain((data ?? []).map(toProduct).map((p) => ({ p, due: p.category === 'Antiparasitic' && Date.now() - Date.parse(last.get(p.handle)!) > 25 * 86400000 }))
        .sort((a, b) => Number(b.due) - Number(a.due)).slice(0, 6));
    }).catch(() => {});
  }, [session]);

  useEffect(() => { const t = setInterval(() => setSlide((s) => (s + 1) % 3), 5000); return () => clearInterval(t); }, []);

  const otc = all?.filter((p) => !p.rx) ?? null;
  const deals = otc ? [...otc].sort((a, b) => b.save_pct - a.save_pct).slice(0, 12) : null;
  const sp = pet?.species === 'cat' ? /\b(cats?|feline|kitten)\b/i : pet?.species === 'dog' ? /\b(dogs?|canine|puppy)\b/i : null;
  const forPet = otc ? (sp ? otc.filter((p) => sp.test(p.title)) : otc.filter((p) => p.category === 'Supplements & Vitamins')).slice(0, 12) : null;
  const ticks = otc ? otc.filter((p) => p.category === 'Antiparasitic').slice(0, 12) : null;
  const catThumb = (name: string) => all?.find((p) => p.category === name);

  const banners = [
    { bg: 'from-plum to-plum-dark', t: 'Tick & flea season', s: 'Sprays, washes, spot-ons and collars', cta: 'Shop now', href: '/s?c=Antiparasitic', e: '🪲' },
    { bg: 'from-plum-dark to-plum', t: 'Not sure what to buy?', s: 'Type the problem in the search bar. Mylo picks for you.', cta: 'Ask Mylo', href: '', e: '🐾' },
    { bg: 'from-plum to-plum-dark', t: `Free delivery over ${inr(delivery.free_min)}`, s: `Evening run ${nextRun || ''} · free pickup in HSR Layout`, cta: 'See deals', href: '/s?k=deals&sort=save', e: '🚚' },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-surface-alt pb-28">
      <Header />

      {/* Banner carousel */}
      <div className="relative overflow-hidden">
        <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${slide * 100}%)` }}>
          {banners.map((b) => {
            const inner = (
              <div className={`flex h-[168px] w-full shrink-0 items-center justify-between bg-gradient-to-br ${b.bg} px-5 text-white`}>
                <div className="max-w-[70%]">
                  <p className="text-[22px] font-extrabold leading-tight">{b.t}</p>
                  <p className="mt-1 text-[13px] text-white/85">{b.s}</p>
                  <span className="mt-3 inline-block rounded-full bg-butter px-4 py-1.5 text-[13px] font-bold text-ink">{b.cta}</span>
                </div>
                <span className="text-[64px]" aria-hidden>{b.e}</span>
              </div>
            );
            return b.href
              ? <Link key={b.t} href={b.href} className="w-full shrink-0">{inner}</Link>
              : <button key={b.t} type="button" onClick={() => openMylo()} className="w-full shrink-0 text-left">{inner}</button>;
          })}
        </div>
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
          {banners.map((_, i) => <button key={i} type="button" aria-label={`Banner ${i + 1}`} onClick={() => setSlide(i)} className={`h-1.5 rounded-full ${i === slide ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`} />)}
        </div>
      </div>

      <div className="-mt-3 space-y-3 px-3">
        {/* Concern cards (Amazon 2x2 cards) */}
        <div className="grid grid-cols-2 gap-3">
          {CONCERNS.map((c) => (
            <section key={c.title} className="rounded-[10px] bg-white p-3 shadow-card">
              <h2 className="text-[15px] font-bold leading-tight text-ink">{c.title}</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {c.tiles.map((t) => (
                  <Link key={t.l} href={`/s?k=${encodeURIComponent(t.k)}`} className="block text-center">
                    <span className="flex aspect-square items-center justify-center rounded-[8px] bg-plum-soft text-[28px]" aria-hidden>{t.e}</span>
                    <span className="mt-1 block text-[11.5px] text-body">{t.l}</span>
                  </Link>
                ))}
              </div>
              <Link href={`/s?k=${encodeURIComponent(c.tiles[0].k)}`} className="mt-2 block text-[12px] font-semibold text-plum">See more</Link>
            </section>
          ))}
        </div>

        {/* Ask Mylo strip */}
        <button type="button" onClick={() => openMylo()} className="flex w-full items-center gap-3 rounded-[10px] bg-white p-3 text-left shadow-card">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-plum text-white"><PawIcon className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold text-ink">Ask Mylo, your shopping assistant</span><span className="block text-[12px] text-muted">“Which tick medicine for a 20 kg Lab?” · “Compare these shampoos”</span></span>
          <span className="text-plum">›</span>
        </button>

        {again.length > 0 && (
          <Row title="Buy it again" href="/orders">
            {again.map(({ p, due }) => (
              <div key={p.handle} className="relative w-[150px] shrink-0">
                {due && <span className="absolute left-2 top-2 z-10 rounded bg-butter px-1.5 py-0.5 text-[10px] font-bold text-ink">Due for refill</span>}
                <ProductTile p={p} />
              </div>
            ))}
          </Row>
        )}

        <Row title="Today’s deals" href="/s?k=deals&sort=save" items={deals} />
        <Row title={pet ? `Top picks for ${pet.name}` : 'Supplements & vitamins'} href={pet ? `/s?k=${encodeURIComponent(`${pet.species} care`)}` : '/s?c=Supplements%20%26%20Vitamins'} items={forPet} />
        <Row title="Tick & flea protection" href="/s?c=Antiparasitic" items={ticks} />

        <section className="rounded-[10px] bg-white p-3 shadow-card">
          <h2 className="text-[17px] font-bold text-ink">Shop by category</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {CATEGORIES.slice(0, 9).map((c) => {
              const t = catThumb(c.name);
              return (
                <Link key={c.name} href={`/s?c=${encodeURIComponent(c.name)}`} className="block text-center">
                  {t ? <ProductImage p={t} className="aspect-square w-full" sizes="120px" /> : <span className="flex aspect-square items-center justify-center rounded-[14px] bg-surface-alt text-[30px]" aria-hidden>{c.emoji}</span>}
                  <span className="mt-1 line-clamp-2 block text-[11.5px] leading-tight text-body">{c.name}</span>
                </Link>
              );
            })}
          </div>
          <Link href="/categories" className="mt-2 block text-[13px] font-semibold text-plum">See all categories</Link>
        </section>

        <section className="rounded-[10px] bg-white p-4 text-center shadow-card">
          <div className="grid grid-cols-3 gap-2 text-[11.5px] font-semibold text-ink">
            <div><div className="text-[22px]" aria-hidden>✅</div>Genuine, from a licensed pet pharmacy</div>
            <div><div className="text-[22px]" aria-hidden>🌆</div>Evening delivery across Bangalore</div>
            <div><div className="text-[22px]" aria-hidden>↩️</div>Cancel before packing, full refund</div>
          </div>
        </section>

        <p className="pt-2 text-center text-[12px] leading-[1.6] text-muted">
          <Link href="/terms" className="underline">Conditions of use</Link> · <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/cancellation" className="underline">Cancellations & refunds</Link><br />© Mylopaws (Prescom Technologies), Bengaluru
        </p>
      </div>
    </div>
  );
}

function Row({ title, href, items, children }: { title: string; href: string; items?: Product[] | null; children?: React.ReactNode }) {
  if (items && !items.length && !children) return null;
  return (
    <section className="rounded-[10px] bg-white py-3 shadow-card">
      <div className="flex items-baseline justify-between px-3">
        <h2 className="text-[17px] font-bold text-ink">{title}</h2>
        <Link href={href} className="text-[13px] font-semibold text-plum">See all</Link>
      </div>
      <div className="mt-2 flex gap-2.5 overflow-x-auto px-3 pb-1">
        {children ?? (items
          ? items.map((p) => <div key={p.handle} className="w-[150px] shrink-0"><ProductTile p={p} /></div>)
          : Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[290px] w-[150px] shrink-0 rounded-card" />))}
      </div>
    </section>
  );
}
