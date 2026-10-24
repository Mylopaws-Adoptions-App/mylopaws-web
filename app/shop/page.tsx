'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CATEGORIES, PRODUCT_COLS, Product, toProduct } from '@/lib/shop';
import { ProductTile } from '@/components/shop/Product';
import AskBar from '@/components/shop/AskBar';
import { EmptyState, ErrorState, Icons, SelectChip, Skeleton } from '@/components/design';

type Sort = 'popular' | 'low' | 'save';

function ShopInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const cat = sp.get('c') ?? '';
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [debounced, setDebounced] = useState(q);
  const [species, setSpecies] = useState<'all' | 'dog' | 'cat'>('all');
  const [sort, setSort] = useState<Sort>('popular');
  const [items, setItems] = useState<Product[] | null>(null);
  const [err, setErr] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    let live = true;
    setItems(null); setErr(false);
    const run = async () => {
      if (debounced.length >= 2) {
        const { data, error } = await supabase.rpc('search_products', { search_query: debounced, result_limit: 60 });
        let rows = data ?? [];
        if (!error && !rows.length) {
          const w = debounced.replace(/[%_,()]/g, ' ').split(/\s+/).filter((x) => x.length > 2).slice(0, 3);
          if (w.length) rows = (await supabase.from('shop_products').select(PRODUCT_COLS).or(w.map((x) => `title.ilike.%${x}%`).join(',')).limit(60)).data ?? [];
        }
        return { rows, error };
      }
      let qb = supabase.from('shop_products').select(PRODUCT_COLS).eq('available', true).order('title').limit(400);
      if (cat) qb = qb.eq('category', cat);
      const { data, error } = await qb;
      return { rows: data ?? [], error };
    };
    run().then(({ rows, error }) => {
      if (!live) return;
      if (error) { setErr(true); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setItems((rows as any[]).filter((r) => r.available !== false).map(toProduct).filter((p) => !cat || debounced.length >= 2 || p.category === cat));
    });
    return () => { live = false; };
  }, [debounced, cat, tick]);

  const shown = useMemo(() => {
    if (!items) return null;
    let list = items;
    if (species !== 'all') {
      const other = species === 'dog' ? /\b(cats?|feline|kitten)\b/i : /\b(dogs?|canine|puppy|puppies)\b/i;
      list = list.filter((p) => !other.test(p.title));
    }
    const stock = (p: Product) => (p.in_stock ? 0 : 1);
    if (sort === 'low') list = [...list].sort((a, b) => stock(a) - stock(b) || a.price - b.price);
    else if (sort === 'save') list = [...list].sort((a, b) => stock(a) - stock(b) || b.save_pct - a.save_pct);
    else list = [...list].sort((a, b) => stock(a) - stock(b) || Number(!!b.image_url) - Number(!!a.image_url));
    return list;
  }, [items, species, sort]);

  const setCat = (c: string) => {
    const u = new URLSearchParams(); if (c) u.set('c', c);
    setQ(''); router.replace(`/shop${u.toString() ? `?${u}` : ''}`, { scroll: false });
  };

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-white pb-40">
      <div className="sticky top-0 z-20 bg-white px-5 pb-3 pt-[calc(1rem+env(safe-area-inset-top))] shadow-[0_1px_0_#E5E5E5]">
        <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-ink">{cat || 'Shop'}</h1>
        <label className="relative mt-3 block">
          <Icons.Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search medicines, shampoos, brands…" aria-label="Search products"
            className="min-h-[48px] w-full rounded-full border border-line bg-surface-alt pl-11 pr-10 text-[15px] text-ink outline-none placeholder:text-muted focus:border-plum" />
          {q && <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-muted"><Icons.Close className="h-4 w-4" /></button>}
        </label>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          <SelectChip label="All" selected={!cat} onClick={() => setCat('')} />
          {CATEGORIES.map((c) => <SelectChip key={c.name} label={`${c.emoji} ${c.name}`} selected={cat === c.name} onClick={() => setCat(c.name)} />)}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {(['all', 'dog', 'cat'] as const).map((s) => (
              <button key={s} type="button" onClick={() => setSpecies(s)} aria-pressed={species === s}
                className={`h-8 rounded-full px-3 text-[12px] font-bold ${species === s ? 'bg-plum text-white' : 'bg-plum-soft text-plum'}`}>
                {s === 'all' ? 'Dogs & cats' : s === 'dog' ? '🐶 Dogs' : '🐱 Cats'}
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort"
            className="h-8 rounded-full border border-line bg-white px-2 text-[12px] font-semibold text-body">
            <option value="popular">Recommended</option>
            <option value="save">Biggest savings</option>
            <option value="low">Price: low to high</option>
          </select>
        </div>
      </div>

      <div className="px-5 pt-4">
        {err ? (
          <ErrorState sub="We couldn't load products. Check your connection." onRetry={() => setTick((t) => t + 1)} />
        ) : !shown ? (
          <div className="grid grid-cols-2 gap-2.5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[300px] rounded-card" />)}</div>
        ) : !shown.length ? (
          <>
            <EmptyState emoji="🔎" title="Nothing found" sub="Try another word, or describe the problem to Mylo." />
            <AskBar placeholder={debounced ? `Ask Mylo about “${debounced}”` : 'Ask Mylo'} />
          </>
        ) : (
          <>
            <p className="mb-3 text-[12px] text-muted">{shown.length} product{shown.length > 1 ? 's' : ''}</p>
            <div className="grid grid-cols-2 gap-2.5">
              {shown.map((p, i) => <ProductTile key={p.handle} p={p} priority={i < 4} />)}
            </div>
            <div className="mt-6"><AskBar placeholder="Can’t decide? Ask Mylo to compare" /></div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ShopPage() {
  return <Suspense fallback={null}><ShopInner /></Suspense>;
}
