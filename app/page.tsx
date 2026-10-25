'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/shop/Header';
import { useShop } from '@/components/shop/ShopProvider';
import { useMylo } from '@/components/shop/MyloChat';
import { ProductImage, ProductTile } from '@/components/shop/Product';
import { CATEGORIES, PRODUCT_COLS, Product, inr, shopFn, toProduct } from '@/lib/shop';
import { Skeleton } from '@/components/design';
import { CONCERNS, TRUST, catIcon, photo } from '@/components/shop/ui';

// Storefront: photo banners, concern tiles, Mylo card, product rails, category grid. Mylo also lives in the search bar.
export default function Home() {
  const { session, pet, delivery, nextRun } = useShop();
  const { openMylo } = useMylo();
  const [all, setAll] = useState<Product[] | null>(null);
  const [again, setAgain] = useState<{ p: Product; due: boolean }[]>([]);

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

  const otc = all?.filter((p) => !p.rx) ?? null;
  const deals = otc ? [...otc].sort((a, b) => b.save_pct - a.save_pct).slice(0, 12) : null;
  const sp = pet?.species === 'cat' ? /\b(cats?|feline|kitten)\b/i : pet?.species === 'dog' ? /\b(dogs?|canine|puppy)\b/i : null;
  const forPet = otc ? (sp ? otc.filter((p) => sp.test(p.title)) : otc.filter((p) => p.category === 'Supplements & Vitamins')).slice(0, 12) : null;
  const ticks = otc ? otc.filter((p) => p.category === 'Antiparasitic').slice(0, 12) : null;
  const catThumb = (name: string) => all?.find((p) => p.category === name);

  const banners = [
    { img: 'Dog walking shot.jpeg', kicker: 'Tick & flea season', t: 'Walk worry-free', s: 'Spot-ons, sprays, washes and collars', cta: 'Shop protection', href: '/s?c=Antiparasitic' },
    { img: 'Pawfamily_Cute.jpeg', kicker: 'Mylo, your pet shopper', t: 'Not sure what to buy?', s: 'Describe the problem. Mylo picks what fits.', cta: 'Ask Mylo', href: '' },
    { img: 'A dog and a cat sleeping close to each other.jpeg', kicker: `Free delivery over ${inr(delivery.free_min)}`, t: 'Evening delivery', s: `Next run ${nextRun || 'this evening'} · or pick up free in HSR`, cta: 'See deals', href: '/s?k=deals&sort=save' },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#FAF8F9] pb-28">
      <Header />

      <Carousel banners={banners} onMylo={() => openMylo()} />

      {/* Trust strip */}
      <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {TRUST.map(({ l, Icon }) => (
          <span key={l} className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#EEE7EB] bg-white px-3 py-1.5 text-[11.5px] font-medium text-body">
            <Icon className="h-3.5 w-3.5 text-success" />{l}
          </span>
        ))}
      </div>

      {/* Concerns */}
      <Section title="What’s bothering your pet?" sub="Tap one. Mylo shows what helps.">
        <div className="grid grid-cols-4 gap-x-2 gap-y-4 px-4">
          {CONCERNS.map(({ l, k, Icon, tint, fg }) => (
            <Link key={l} href={`/s?k=${encodeURIComponent(k)}`} className="flex flex-col items-center gap-1.5 text-center active:scale-95">
              <span className="flex aspect-square w-full max-w-[68px] items-center justify-center rounded-[20px]" style={{ background: tint, color: fg }}>
                <Icon className="h-7 w-7" strokeWidth={1.8} />
              </span>
              <span className="text-[11.5px] font-medium leading-tight text-ink">{l}</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* Ask Mylo card */}
      <div className="mx-4 mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-plum via-[#7E2456] to-[#4E1335] p-4 text-white">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"><Sparkles className="h-5 w-5 text-butter" /></span>
          <div>
            <p className="text-[15px] font-semibold leading-tight">Ask Mylo</p>
            <p className="text-[12px] text-white/70">Your pet-care shopping assistant</p>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {[`Which tick medicine for a ${pet?.weight_kg ? `${pet.weight_kg} kg` : '20 kg'} ${pet?.species === 'cat' ? 'cat' : 'dog'}?`, 'Compare the best anti-itch shampoos'].map((q) => (
            <Link key={q} href={`/s?k=${encodeURIComponent(q)}`} className="flex items-center justify-between gap-2 rounded-2xl bg-white/10 px-3.5 py-2.5 text-[13px] ring-1 ring-white/10 active:bg-white/20">
              <span>“{q}”</span><ArrowRight className="h-4 w-4 shrink-0 opacity-70" />
            </Link>
          ))}
        </div>
        <button type="button" onClick={() => openMylo()} className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-butter text-[14px] font-semibold text-ink">
          Chat with Mylo
        </button>
      </div>

      {again.length > 0 && (
        <Rail title="Buy it again" href="/orders">
          {again.map(({ p, due }) => <div key={p.handle} className="w-[138px] shrink-0 snap-start"><ProductTile p={p} tag={due ? 'Due for refill' : undefined} /></div>)}
        </Rail>
      )}

      <Rail title="Today’s deals" href="/s?k=deals&sort=save" items={deals} />

      {/* Categories */}
      <Section title="Shop by category" href="/categories">
        <div className="grid grid-cols-3 gap-2.5 px-4">
          {CATEGORIES.slice(0, 9).map((c) => {
            const t = catThumb(c.name);
            const ic = catIcon(c.name);
            return (
              <Link key={c.name} href={`/s?c=${encodeURIComponent(c.name)}`} className="overflow-hidden rounded-2xl border border-[#EEE7EB] bg-white active:scale-[0.98]">
                <div className="relative aspect-[5/4]" style={{ background: ic.tint }}>
                  {t ? <div className="absolute inset-1.5"><ProductImage p={t} className="h-full w-full !bg-transparent" sizes="120px" /></div>
                    : <span className="absolute inset-0 flex items-center justify-center" style={{ color: ic.fg }}><ic.Icon className="h-8 w-8" /></span>}
                </div>
                <p className="line-clamp-2 min-h-[38px] px-2 py-1.5 text-[11.5px] font-medium leading-tight text-ink">{c.name}</p>
              </Link>
            );
          })}
        </div>
      </Section>

      <Rail title={pet ? `Picked for ${pet.name}` : 'Supplements & vitamins'} href={pet ? `/s?k=${encodeURIComponent(`${pet.species} care`)}` : '/s?c=Supplements%20%26%20Vitamins'} items={forPet} />
      <Rail title="Tick & flea protection" href="/s?c=Antiparasitic" items={ticks} />

      <p className="px-4 pt-8 text-center text-[11.5px] leading-[1.7] text-muted">
        <Link href="/terms" className="underline">Conditions of use</Link> · <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/cancellation" className="underline">Cancellations & refunds</Link><br />© Mylopaws (Prescom Technologies), Bengaluru
      </p>
    </div>
  );
}

type Banner = { img: string; kicker: string; t: string; s: string; cta: string; href: string };

/** Swipeable photo banners with a peek of the next card and progress dots. */
function Carousel({ banners, onMylo }: { banners: Banner[]; onMylo: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      const el = ref.current;
      if (!el || paused.current) return;
      const next = (i + 1) % banners.length;
      el.scrollTo({ left: (el.children[next] as HTMLElement).offsetLeft - 16, behavior: 'smooth' });
    }, 5000);
    return () => clearInterval(t);
  }, [i, banners.length]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const w = (el.children[0] as HTMLElement).offsetWidth + 10;
    setI(Math.round(el.scrollLeft / w));
  };

  return (
    <div className="mt-4">
      <div ref={ref} onScroll={onScroll} onTouchStart={() => { paused.current = true; }}
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {banners.map((b, n) => {
          const inner = (
            <div className="relative h-[184px] w-full overflow-hidden rounded-3xl bg-plum-dark">
              <Image src={photo(b.img)} alt="" fill sizes="(max-width: 480px) 90vw, 430px" priority={n === 0} className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#3A0E27]/90 via-[#3A0E27]/55 to-transparent" />
              <div className="relative flex h-full max-w-[72%] flex-col justify-end p-4 text-white">
                <span className="mb-1.5 w-fit rounded-full bg-white/15 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-butter backdrop-blur">{b.kicker}</span>
                <p className="text-[21px] font-bold leading-tight tracking-tight">{b.t}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-white/85">{b.s}</p>
                <span className="mt-2.5 inline-flex w-fit items-center gap-1 rounded-full bg-butter px-3.5 py-1.5 text-[12.5px] font-semibold text-ink">{b.cta}<ChevronRight className="h-3.5 w-3.5" /></span>
              </div>
            </div>
          );
          return b.href
            ? <Link key={b.t} href={b.href} className="w-[90%] shrink-0 snap-start">{inner}</Link>
            : <button key={b.t} type="button" onClick={onMylo} className="w-[90%] shrink-0 snap-start text-left">{inner}</button>;
        })}
      </div>
      <div className="mt-2 flex justify-center gap-1.5">
        {banners.map((_, n) => <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-5 bg-plum' : 'w-1.5 bg-[#D9CDD4]'}`} />)}
      </div>
    </div>
  );
}

function Section({ title, sub, href, children }: { title: string; sub?: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="pt-6">
      <div className="mb-3 flex items-end justify-between px-4">
        <div>
          <h2 className="text-[17px] font-bold tracking-tight text-ink">{title}</h2>
          {sub && <p className="text-[12px] text-muted">{sub}</p>}
        </div>
        {href && <Link href={href} className="flex items-center text-[13px] font-semibold text-plum">See all<ChevronRight className="h-4 w-4" /></Link>}
      </div>
      {children}
    </section>
  );
}

function Rail({ title, href, items, children }: { title: string; href: string; items?: Product[] | null; children?: React.ReactNode }) {
  if (items && !items.length && !children) return null;
  return (
    <Section title={title} href={href}>
      <div className="flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children ?? (items
          ? items.map((p) => <div key={p.handle} className="w-[138px] shrink-0 snap-start"><ProductTile p={p} /></div>)
          : Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[220px] w-[138px] shrink-0 rounded-2xl" />))}
      </div>
    </Section>
  );
}
