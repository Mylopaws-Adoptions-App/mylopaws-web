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
import { motion } from 'motion/react';
import { Check, SlidersHorizontal, Sparkles, ArrowRight } from 'lucide-react';
import { CATEGORIES } from '@/lib/shop';
import { catIcon } from '@/components/shop/ui';

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

  const chip = (on: boolean) => `flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[12px] font-semibold transition ${on ? 'bg-plum text-white' : 'border border-[#E6DDE2] bg-white text-body'}`;

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-white pb-28">
      <Header initial={k && !deals ? k : ''} back />

      {/* Category switcher with a sliding pill (browse mode) */}
      {cat && (
        <div className="flex gap-1.5 overflow-x-auto px-4 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((c) => {
            const on = c.name === cat;
            const { Icon } = catIcon(c.name);
            return (
              <button key={c.name} type="button" onClick={() => router.replace(`/s?c=${encodeURIComponent(c.name)}`)}
                className={`relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold ${on ? 'text-white' : 'text-body'}`}>
                {on && <motion.span layoutId="cat-pill" transition={{ type: 'spring', stiffness: 380, damping: 30 }} className="absolute inset-0 rounded-full bg-plum" />}
                {!on && <span className="absolute inset-0 rounded-full border border-[#E6DDE2]" />}
                <Icon className="relative h-4 w-4" /><span className="relative">{c.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="relative flex shrink-0 rounded-full bg-[#F3EEF1] p-0.5">
          {(['all', 'dog', 'cat'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setSpecies(s)} className={`relative h-7 rounded-full px-3 text-[12px] font-semibold ${species === s ? 'text-ink' : 'text-muted'}`}>
              {species === s && <motion.span layoutId="species-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} className="absolute inset-0 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]" />}
              <span className="relative">{s === 'all' ? 'All' : s === 'dog' ? 'Dogs' : 'Cats'}</span>
            </button>
          ))}
        </div>
        <label className={`${chip(sort !== 'featured')} relative`}>
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {sort === 'low' ? 'Price ↑' : sort === 'high' ? 'Price ↓' : sort === 'save' ? 'Discount' : 'Sort'}
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by" className="absolute inset-0 opacity-0">
            <option value="featured">Featured</option>
            <option value="low">Price: Low to High</option>
            <option value="high">Price: High to Low</option>
            <option value="save">Biggest discount</option>
          </select>
        </label>
        <button type="button" className={chip(stockOnly)} onClick={() => setStockOnly(!stockOnly)}>{stockOnly && <Check className="h-3.5 w-3.5" />}In stock</button>
        <button type="button" className={chip(noRx)} onClick={() => setNoRx(!noRx)}>{noRx && <Check className="h-3.5 w-3.5" />}No prescription</button>
      </div>

      <div className="px-4">
        {answer && (
          <section className="mb-2 overflow-hidden rounded-3xl bg-gradient-to-br from-[#F7EEF3] to-[#FFF8E1] p-4 ring-1 ring-plum/10" aria-live="polite">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-plum">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-plum text-butter"><Sparkles className="h-4 w-4" /></span> Mylo’s picks for you
            </div>
            {answer === 'loading' ? (
              <div className="mt-3 space-y-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /><div className="flex gap-3 pt-1"><Skeleton className="h-40 w-[130px] rounded-2xl" /><Skeleton className="h-40 w-[130px] rounded-2xl" /></div></div>
            ) : (
              <>
                {answer.text && <p className="mt-2.5 text-[14px] leading-[1.55] text-body">{answer.text}</p>}
                {answer.picks.length > 0 && (
                  <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {answer.picks.map((p) => <div key={p.handle} className="w-[132px] shrink-0"><ProductTile p={p} /></div>)}
                  </div>
                )}
                <button type="button" onClick={() => openMylo({ prompt: k })} className="mt-3 flex items-center gap-1 text-[13px] font-semibold text-plum">Ask a follow-up<ArrowRight className="h-4 w-4" /></button>
              </>
            )}
          </section>
        )}

        <p className="mt-2 text-[12.5px] text-muted">
          {shown ? `${shown.length} result${shown.length === 1 ? '' : 's'}` : 'Searching…'}
          {k && !deals ? <> for <b className="font-semibold text-ink">“{k}”</b></> : cat ? null : deals ? <> · <b className="text-danger">Today’s deals</b></> : null}
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
            className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-plum-soft text-[14px] font-semibold text-plum">
            <Sparkles className="h-4 w-4" /> Can’t decide? Ask Mylo
          </button>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={null}><Results /></Suspense>;
}
