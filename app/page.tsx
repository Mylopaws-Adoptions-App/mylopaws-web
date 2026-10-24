'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useShop } from '@/components/shop/ShopProvider';
import { PetPill } from '@/components/shop/PetSheet';
import AskBar from '@/components/shop/AskBar';
import { ProductRow, ProductTile } from '@/components/shop/Product';
import { CATEGORIES, PROBLEMS, PRODUCT_COLS, Product, shopFn, toProduct } from '@/lib/shop';
import { Icons, Skeleton } from '@/components/design';

// Shop home: agent-first (Ask Mylo + problem starters), then refills, savings and categories.
export default function Home() {
  const { session, pet, delivery, nextRun } = useShop();
  const [name, setName] = useState('');
  const [deals, setDeals] = useState<Product[] | null>(null);
  const [ticks, setTicks] = useState<Product[] | null>(null);
  const [again, setAgain] = useState<{ p: Product; due: boolean }[]>([]);

  useEffect(() => {
    supabase.from('shop_products').select(PRODUCT_COLS).eq('available', true).eq('in_stock', true).eq('rx_required', false)
      .neq('category', 'Vaccines').limit(400)
      .then(({ data }) => {
        const all = (data ?? []).map(toProduct).filter((p) => p.image_url);
        setDeals([...all].sort((a, b) => b.save_pct - a.save_pct || b.price - a.price).slice(0, 10));
        const sp = pet?.species === 'cat' ? /cat|feline/i : /dog|canine|tick|flea/i;
        setTicks(all.filter((p) => p.category === 'Antiparasitic' && (!pet || sp.test(p.title))).slice(0, 10));
      });
  }, [pet]);

  // Signed in: greet by name and offer one-tap reorders (antiparasitics bought 25+ days ago are "due").
  useEffect(() => {
    if (!session) { setAgain([]); return; }
    supabase.from('customers').select('name').eq('id', session.user.id).single().then(({ data }) => setName((data?.name ?? '').split(' ')[0]));
    shopFn<{ orders: { items: { handle: string }[]; payment_status: string; created_at: string }[] }>('orders').then(async ({ orders }) => {
      const lastBought = new Map<string, string>();
      for (const o of orders.filter((x) => x.payment_status === 'paid')) for (const it of o.items ?? []) if (it.handle && !lastBought.has(it.handle)) lastBought.set(it.handle, o.created_at);
      if (!lastBought.size) return;
      const { data } = await supabase.from('shop_products').select(PRODUCT_COLS).in('handle', Array.from(lastBought.keys()).slice(0, 12));
      setAgain((data ?? []).map(toProduct).map((p) => ({ p, due: p.category === 'Antiparasitic' && Date.now() - Date.parse(lastBought.get(p.handle)!) > 25 * 86400000 }))
        .sort((a, b) => Number(b.due) - Number(a.due)).slice(0, 4));
    }).catch(() => {});
  }, [session]);

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-plum">
      <header className="px-5 pb-9 pt-[calc(1.5rem+env(safe-area-inset-top))] text-white">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold uppercase tracking-[2px] text-white/80">Mylopaws Shop</span>
          {!session && <Link href="/login" className="text-[13px] font-bold text-butter">Sign in</Link>}
        </div>
        <h1 className="mt-3 text-[30px] font-extrabold leading-[1.15] tracking-[-0.5px]">
          {name ? `Hi ${name} 👋` : 'Pet care, sorted.'}<br />
          <span className="text-butter">What does {pet?.name ?? 'your pet'} need?</span>
        </h1>
        <div className="mt-4"><PetPill onDark /></div>
        <AskBar className="mt-4 border-white" />
      </header>

      <main className="-mt-4 min-h-[60vh] rounded-t-[24px] bg-white px-5 pb-40 pt-7">
        <section>
          <h2 className="text-[20px] font-bold text-ink">What’s going on?</h2>
          <p className="mt-0.5 text-[13px] text-muted">Tap a concern and Mylo finds what helps.</p>
          <div className="-mx-5 mt-3 grid auto-cols-[132px] grid-flow-col grid-rows-2 gap-2.5 overflow-x-auto px-5 pb-1">
            {PROBLEMS.map((pr) => (
              <Link key={pr.label} href={`/ask?q=${encodeURIComponent(pr.prompt)}`}
                className="flex min-h-[56px] items-center gap-2 rounded-card border border-line bg-white px-3 py-2 shadow-card active:scale-[0.98]">
                <span className="text-[22px]" aria-hidden>{pr.emoji}</span>
                <span className="text-[12.5px] font-semibold leading-tight text-ink">{pr.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {again.length > 0 && (
          <section className="mt-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[20px] font-bold text-ink">Buy again</h2>
              <Link href="/orders" className="text-[13px] font-bold text-plum">Orders</Link>
            </div>
            <div className="mt-3 space-y-2.5">
              {again.map(({ p, due }) => (
                <div key={p.handle} className="relative">
                  {due && <span className="absolute -top-2 left-3 z-10 rounded-full bg-butter px-2 py-0.5 text-[10px] font-bold text-plum">Due for refill</span>}
                  <ProductRow p={p} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 grid grid-cols-3 gap-2 text-center">
          {[
            { e: '🚚', t: `Free delivery over ₹${delivery.free_min.toLocaleString('en-IN')}`, s: `else ₹${delivery.fee}` },
            { e: '🌆', t: nextRun ? `Next run ${nextRun}` : 'Evening delivery', s: delivery.window },
            { e: '🏪', t: 'Free pickup', s: 'HSR Layout store' },
          ].map((x) => (
            <div key={x.t} className="rounded-card bg-surface-alt px-2 py-3">
              <div className="text-[20px]" aria-hidden>{x.e}</div>
              <p className="mt-1 text-[11.5px] font-bold leading-tight text-ink">{x.t}</p>
              <p className="text-[11px] text-muted">{x.s}</p>
            </div>
          ))}
        </section>

        <Row title={pet ? `Tick & flea care for ${pet.name}` : 'Tick & flea season'} href="/shop?c=Antiparasitic" items={ticks} />
        <Row title="Best savings today" href="/shop" items={deals} />

        <section className="mt-8">
          <h2 className="text-[20px] font-bold text-ink">Shop by category</h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {CATEGORIES.map((c) => (
              <Link key={c.name} href={`/shop?c=${encodeURIComponent(c.name)}`} className="flex items-center gap-2.5 rounded-card bg-white p-3 shadow-card active:scale-[0.98]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-plum-soft text-[20px]" aria-hidden>{c.emoji}</span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold leading-tight text-ink">{c.name}</span>
                  <span className="block truncate text-[11px] text-muted">{c.blurb}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-card bg-butter p-5">
          <p className="text-[15px] font-bold text-ink">Not sure what to get?</p>
          <p className="mt-1 text-[14px] leading-[1.5] text-body">Tell Mylo what’s happening with your pet. It shows options, compares them and builds your cart.</p>
          <Link href="/ask" className="mt-4 flex min-h-[48px] items-center justify-center rounded-full bg-white text-[15px] font-bold text-plum">Ask Mylo</Link>
        </section>

        <p className="mt-8 text-center text-[12px] leading-[1.6] text-muted">
          Genuine products from a licensed pet pharmacy · Bangalore only<br />
          <Link href="/terms" className="underline">Terms</Link> · <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/cancellation" className="underline">Cancellations</Link>
        </p>
      </main>
    </div>
  );
}

function Row({ title, href, items }: { title: string; href: string; items: Product[] | null }) {
  if (items && !items.length) return null;
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[20px] font-bold text-ink">{title}</h2>
        <Link href={href} className="flex items-center text-[13px] font-bold text-plum">See all <Icons.ChevronRight className="h-4 w-4" /></Link>
      </div>
      <div className="-mx-5 mt-3 flex gap-2.5 overflow-x-auto px-5 pb-2">
        {items
          ? items.map((p, i) => <div key={p.handle} className="w-[158px] shrink-0"><ProductTile p={p} priority={i < 2} /></div>)
          : Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[300px] w-[158px] shrink-0 rounded-card" />)}
      </div>
    </section>
  );
}
