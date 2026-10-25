'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { PRODUCT_COLS, Product, shopFn, toProduct } from '@/lib/shop';
import Header, { looksLikeQuestion } from '@/components/shop/Header';
import { useShop } from '@/components/shop/ShopProvider';
import { useMylo } from '@/components/shop/MyloChat';
import { ProductTile, ResultRow } from '@/components/shop/Product';
import { EmptyState, ErrorState, Skeleton } from '@/components/design';
import { PawIcon } from '@/components/design/nav-icons';

type Sort = 'featured' | 'low' | 'high' | 'save';
type Answer = { text: string; picks: Product[] };

function Results() {
  const router = useRouter();
  const sp = useSearchParams();
  const k = sp.get('k') ?? '';
  const cat = sp.get('c') ?? '';
  const { pet } = useShop();
  const { openMylo } = useMylo();
  const [items, setItems] = useState<Product[] | null>(null);
  const [err, setErr] = useState(false);
  const [species, setSpecies] = useState<'all' | 'dog' | 'cat'>('all');
  const [stockOnly, setStockOnly] = useState(true);
  const [noRx, setNoRx] = useState(false);
  const [sort, setSort] = useState<Sort>((sp.get('sort') as Sort) || 'featured');
  const [answer, setAnswer] = useState<Answer | null | 'loading'>(null);
  const [tick, setTick] = useState(0);
  const deals = k === 'deals';

  // Products
  useEffect(() => {
    let live = true;
    setItems(null); setErr(false);
    (async () => {
      let rows: unknown[] = [];
      if (k && !deals) {
        const { data, error } = await supabase.rpc('search_products', { search_query: k, result_limit: 60 });
        if (error) throw error;
        rows = data ?? [];
        if (!rows.length) {
          const w = k.replace(/[%_,()?]/g, ' ').split(/\s+/).filter((x) => x.length > 2).slice(0, 4);
          if (w.length) rows = (await supabase.from('shop_products').select(PRODUCT_COLS).or(w.map((x) => `title.ilike.%${x}%`).join(',')).limit(60)).data ?? [];
        }
      } else {
        let qb = supabase.from('shop_products').select(PRODUCT_COLS).eq('available', true).limit(400);
        if (cat) qb = qb.eq('category', cat);
        const { data, error } = await qb;
        if (error) throw error;
        rows = data ?? [];
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (live) setItems((rows as any[]).filter((r) => r.available !== false).map(toProduct));
    })().catch(() => live && setErr(true));
    if (k) track('search', { search_term: k });
    return () => { live = false; };
  }, [k, cat, deals, tick]);

  // Mylo's answer for natural-language searches (cached per query for this tab)
  useEffect(() => {
    if (!k || deals || !looksLikeQuestion(k)) { setAnswer(null); return; }
    const key = `mp_ans:${k.toLowerCase()}:${pet?.species ?? ''}${pet?.weight_kg ?? ''}`;
    try { const c = sessionStorage.getItem(key); if (c) { setAnswer(JSON.parse(c)); return; } } catch { /* ignore */ }
    let live = true;
    setAnswer('loading');
    shopFn<Answer>('search_answer', { q: k, pet: pet ?? undefined })
      .then((a) => { if (!live) return; setAnswer(a); try { sessionStorage.setItem(key, JSON.stringify(a)); } catch { /* ignore */ } })
      .catch(() => live && setAnswer(null));
    return () => { live = false; };
  }, [k, deals, pet]);

  const shown = useMemo(() => {
    if (!items) return null;
    let list = items;
    if (species !== 'all') {
      const other = species === 'dog' ? /\b(cats?|feline|kitten)\b/i : /\b(dogs?|canine|puppy|puppies)\b/i;
      list = list.filter((p) => !other.test(p.title));
    }
    if (stockOnly) list = list.filter((p) => p.in_stock);
    if (noRx) list = list.filter((p) => !p.rx && !p.vaccine);
    const s = deals && sort === 'featured' ? 'save' : sort;
    if (s === 'low') list = [...list].sort((a, b) => a.price - b.price);
    else if (s === 'high') list = [...list].sort((a, b) => b.price - a.price);
    else if (s === 'save') list = [...list].sort((a, b) => b.save_pct - a.save_pct);
    else if (!k) list = [...list].sort((a, b) => Number(!!b.image_url) - Number(!!a.image_url) || b.save_pct - a.save_pct);
    return list;
  }, [items, species, stockOnly, noRx, sort, deals, k]);

  const chip = (on: boolean) => `h-8 shrink-0 rounded-full px-3 text-[12px] font-semibold ${on ? 'border border-plum bg-plum-soft text-plum' : 'border border-line bg-white text-body'}`;

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-white pb-28">
      <Header initial={k && !deals ? k : ''} categories={false} />

      <div className="flex items-center gap-2 overflow-x-auto border-b border-line px-3 py-2">
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by" className="h-8 shrink-0 rounded-full border border-line bg-white px-2 text-[12px] font-semibold text-body">
          <option value="featured">Sort: Featured</option>
          <option value="low">Price: Low to High</option>
          <option value="high">Price: High to Low</option>
          <option value="save">Biggest discount</option>
        </select>
        <button type="button" className={chip(species === 'dog')} onClick={() => setSpecies(species === 'dog' ? 'all' : 'dog')}>🐶 Dogs</button>
        <button type="button" className={chip(species === 'cat')} onClick={() => setSpecies(species === 'cat' ? 'all' : 'cat')}>🐱 Cats</button>
        <button type="button" className={chip(stockOnly)} onClick={() => setStockOnly(!stockOnly)}>In stock</button>
        <button type="button" className={chip(noRx)} onClick={() => setNoRx(!noRx)}>No prescription</button>
      </div>

      <div className="px-3">
        {answer && (
          <section className="mt-3 rounded-card border border-plum/20 bg-plum-soft p-3" aria-live="polite">
            <div className="flex items-center gap-2 text-[13px] font-bold text-plum">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-plum text-white"><PawIcon className="h-4 w-4" /></span> Mylo’s picks
            </div>
            {answer === 'loading' ? (
              <div className="mt-2 space-y-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /><div className="flex gap-2"><Skeleton className="h-40 w-[140px] rounded-card" /><Skeleton className="h-40 w-[140px] rounded-card" /></div></div>
            ) : (
              <>
                {answer.text && <p className="mt-2 text-[14px] leading-[1.5] text-body">{answer.text}</p>}
                {answer.picks.length > 0 && (
                  <div className="-mx-3 mt-2 flex gap-2 overflow-x-auto px-3 pb-1">
                    {answer.picks.map((p) => <div key={p.handle} className="w-[150px] shrink-0"><ProductTile p={p} /></div>)}
                  </div>
                )}
                <button type="button" onClick={() => openMylo({ prompt: k })} className="mt-2 text-[13px] font-bold text-plum underline underline-offset-2">Ask Mylo a follow-up ›</button>
              </>
            )}
          </section>
        )}

        <p className="mt-3 text-[13px] text-body">
          {shown ? `${shown.length} result${shown.length === 1 ? '' : 's'}` : 'Searching…'}
          {k && !deals ? <> for <b className="text-ink">“{k}”</b></> : cat ? <> in <b className="text-ink">{cat}</b></> : deals ? <> · <b className="text-danger">Today’s deals</b></> : null}
        </p>

        {err ? <ErrorState sub="We couldn't load products." onRetry={() => setTick((t) => t + 1)} />
          : !shown ? <div className="space-y-3 pt-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-card" />)}</div>
          : !shown.length ? (
            <EmptyState emoji="🔎" title="No results" sub="Try different words, or ask Mylo to help find it."
              action={{ label: 'Ask Mylo', onClick: () => openMylo({ prompt: k || cat || undefined }) }} />
          ) : (
            <div>{shown.map((p, i) => <ResultRow key={p.handle} p={p} priority={i < 3} />)}</div>
          )}
        {shown && shown.length > 0 && (
          <button type="button" onClick={() => openMylo({ prompt: k ? `Help me choose: ${k}` : cat ? `Help me choose in ${cat}` : undefined })}
            className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-plum text-[14px] font-bold text-plum">
            <PawIcon className="h-5 w-5" /> Can’t decide? Ask Mylo
          </button>
        )}
        {cat && <button type="button" onClick={() => router.push('/categories')} className="mt-3 w-full text-center text-[13px] font-semibold text-plum">All categories</button>}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={null}><Results /></Suspense>;
}
