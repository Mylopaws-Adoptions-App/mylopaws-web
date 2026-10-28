'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronLeft, Clock, MapPin, PawPrint, Search, Sparkles, UserRound, X, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useShop } from './ShopProvider';
import { CATEGORIES, PRODUCT_COLS, Product, readLS, toProduct, writeLS } from '@/lib/shop';
import { PetSheet } from './PetSheet';
import { ProductImage } from './Product';
import { STARTERS, catIcon } from './ui';

/** Natural-language queries get a Mylo answer on the results page; plain product names just search. */
export const looksLikeQuestion = (q: string) =>
  /\?|\b(my|for|help|best|what|which|how|should|need|suggest|recommend|good|vs|versus|itch|scratch|tick|flea|smell|shed|dandruff|puppy|kitten|senior|joint|vomit|loose|diet)\b/i.test(q) || q.trim().split(/\s+/).length >= 4;

const HINTS = ['tick care for a 15 kg dog', 'my cat has dandruff', 'Bravecto 20–40 kg', 'gentle shampoo for a puppy', 'joint support for an old Lab'];

/**
 * Compact plum header: logo, pet chip, one big search field where Mylo lives, and a delivery line.
 * Typing opens a full-screen search sheet with live product matches and an "Ask Mylo" row.
 */
export default function Header({ initial = '', back }: { categories?: boolean; initial?: string; back?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const { pet, session, nextRun, delivery } = useShop();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [sugg, setSugg] = useState<Product[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [petOpen, setPetOpen] = useState(false);
  const [hint, setHint] = useState(0);
  const sheetInput = useRef<HTMLInputElement>(null);

  useEffect(() => { setQ(initial); }, [initial]);
  useEffect(() => { if (open) setRecent(readLS<string[]>('mp_recent_q', [])); }, [open]);
  useEffect(() => { const t = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 3200); return () => clearInterval(t); }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);

  // Live product suggestions while typing.
  useEffect(() => {
    const t = q.trim();
    if (!open || t.length < 2) { setSugg([]); return; }
    const id = setTimeout(async () => {
      const { data } = await supabase.rpc('search_products', { search_query: t, result_limit: 6 });
      let rows = data ?? [];
      if (!rows.length) rows = (await supabase.from('shop_products').select(PRODUCT_COLS).eq('available', true).ilike('title', `%${t.replace(/[%_,()]/g, ' ')}%`).limit(6)).data ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSugg((rows as any[]).map(toProduct));
    }, 200);
    return () => clearTimeout(id);
  }, [q, open]);

  const go = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    writeLS('mp_recent_q', [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 6));
    setOpen(false); sheetInput.current?.blur();
    router.push(`/s?k=${encodeURIComponent(t)}`);
  };

  const catHit = q.trim().length >= 2 ? CATEGORIES.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 2) : [];
  const petLabel = pet ? `${pet.name}${pet.weight_kg ? ` · ${pet.weight_kg} kg` : ''}` : 'Add your pet';

  const openSheet = () => { sheetInput.current?.focus(); setOpen(true); };

  const field = (
    <div role="search" className="flex h-12 items-center rounded-full bg-white pl-4 pr-1.5 text-ink shadow-[0_4px_14px_rgba(0,0,0,0.12)]">
      <button type="button" onClick={openSheet} aria-label="Search products or ask Mylo" className="flex h-full min-w-0 flex-1 items-center text-left">
        <Search className="h-[18px] w-[18px] shrink-0 text-muted" />
        {q ? <span className="truncate px-2.5 text-[15px]">{q}</span> : (
          <span className="flex min-w-0 flex-1 items-center overflow-hidden px-2.5 text-[14px] text-muted">
            <span className="shrink-0">Try&nbsp;</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={hint} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.25 }} className="truncate">
                “{HINTS[hint]}”
              </motion.span>
            </AnimatePresence>
          </span>
        )}
      </button>
      <button type="button" onClick={() => (q ? go(q) : openSheet())} aria-label="Ask Mylo" className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-plum px-3 text-[13px] font-semibold text-white">
        <Sparkles className="h-4 w-4 text-butter" />Ask
      </button>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 rounded-b-[22px] bg-plum px-4 pb-3 pt-[calc(env(safe-area-inset-top)+10px)] text-white shadow-[0_6px_20px_rgba(78,19,53,0.25)]">
        <div className="flex items-center gap-2">
          {back && (
            <button type="button" onClick={() => (history.length > 1 ? router.back() : router.push('/'))} aria-label="Back" className="-ml-1.5 flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10">
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          <Link href="/" className="text-[21px] font-extrabold tracking-[-0.6px]" aria-label="Mylopaws home">mylo<span className="text-butter">paws</span></Link>
          <span className="ml-auto" />
          <button type="button" onClick={() => setPetOpen(true)} className="flex h-8 max-w-[52%] items-center gap-1.5 rounded-full bg-white/10 px-3 text-[12.5px] font-semibold ring-1 ring-white/20">
            <PawPrint className="h-3.5 w-3.5 shrink-0 text-butter" /><span className="truncate">{petLabel}</span><ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
          </button>
          {!session && path !== '/login' && (
            <Link href="/login" aria-label="Sign in" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20"><UserRound className="h-4 w-4" /></Link>
          )}
        </div>
        <div className="mt-3">{field}</div>
        <p className="mt-2 flex items-center gap-1.5 truncate px-1 text-[12px] text-white/80">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-butter" />
          <span className="truncate">Bengaluru · Next delivery <b className="font-semibold text-white">{nextRun || 'this evening'}</b>, {delivery.window}</span>
        </p>
      </header>

      <div aria-hidden={!open} className={`fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col bg-white transition-[opacity,transform] duration-200 ${open ? 'opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}>
            <div className="flex items-center gap-2 border-b border-[#F0EAEE] px-3 pb-3 pt-[calc(env(safe-area-inset-top)+10px)]">
              <button type="button" onClick={() => setOpen(false)} aria-label="Close search" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink"><ChevronLeft className="h-6 w-6" /></button>
              <div className="min-w-0 flex-1">
                <form onSubmit={(e) => { e.preventDefault(); go(q); }} role="search">
                  <div className="flex h-11 items-center rounded-full bg-[#F5F2F4] pl-3.5 pr-1">
                    <Search className="h-[18px] w-[18px] shrink-0 text-muted" />
                    <input ref={sheetInput} tabIndex={open ? 0 : -1} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or describe the problem" aria-label="Search" enterKeyHint="search"
                      className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-[15px] outline-none placeholder:text-muted" />
                    {q && <button type="button" aria-label="Clear" onClick={() => { setQ(''); sheetInput.current?.focus(); }} className="flex h-9 w-9 items-center justify-center text-muted"><X className="h-4 w-4" /></button>}
                  </div>
                </form>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-10">
              {q.trim().length >= 2 && (
                <button type="button" onClick={() => go(q)} className="mx-3 mt-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-2xl bg-gradient-to-r from-plum to-[#8A2A60] p-3 text-left text-white">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><Sparkles className="h-5 w-5 text-butter" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold">Ask Mylo: “{q.trim()}”</span><span className="block text-[12px] text-white/75">Best picks for your pet, with a short answer</span></span>
                  <ArrowUpRight className="h-5 w-5 shrink-0 opacity-80" />
                </button>
              )}
              {catHit.map((c) => {
                const ic = catIcon(c.name);
                return (
                  <Link key={c.name} href={`/s?c=${encodeURIComponent(c.name)}`} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 text-[14px] text-ink">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: ic.tint, color: ic.fg }}><ic.Icon className="h-[18px] w-[18px]" /></span>
                    <span>All in <b className="font-semibold">{c.name}</b></span>
                  </Link>
                );
              })}
              {sugg.length > 0 && <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Products</p>}
              {sugg.map((p) => (
                <Link key={p.handle} href={`/p/${p.handle}`} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2 text-[14px] text-ink active:bg-[#F7F4F6]">
                  <ProductImage p={p} className="h-11 w-11 shrink-0 rounded-xl" sizes="44px" />
                  <span className="line-clamp-2 min-w-0 flex-1 leading-snug">{p.title}</span>
                  <span className="shrink-0 text-[13px] font-semibold">₹{Math.round(p.price).toLocaleString('en-IN')}</span>
                </Link>
              ))}
              {q.trim().length < 2 && (
                <div className="px-4 pt-4">
                  {recent.length > 0 && (
                    <>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Recent</p>
                      <div className="mt-1">
                        {recent.map((r) => <button key={r} type="button" onClick={() => go(r)} className="flex w-full items-center gap-3 py-2.5 text-left text-[14px] text-ink"><Clock className="h-4 w-4 text-muted" /><span className="truncate">{r}</span></button>)}
                      </div>
                    </>
                  )}
                  <p className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted"><Sparkles className="h-3.5 w-3.5 text-plum" />Describe it, Mylo will pick</p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    {STARTERS.map((s) => (
                      <button key={s.l} type="button" onClick={() => go(s.prompt)} className="flex min-h-[48px] items-center gap-2 rounded-2xl border border-[#EEE7EB] px-3 text-left text-[13px] font-medium text-ink active:bg-[#F7F4F6]">
                        <s.Icon className="h-4 w-4 shrink-0 text-plum" />{s.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
      </div>
      <PetSheet open={petOpen} onClose={() => setPetOpen(false)} />
    </>
  );
}

/** Reads ?k= for pages that show the header with the current query. */
export function useQueryParam(name: string) {
  const sp = useSearchParams();
  return sp.get(name) ?? '';
}
