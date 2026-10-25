'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useShop } from './ShopProvider';
import { CATEGORIES, PROBLEMS, PRODUCT_COLS, Product, readLS, toProduct, writeLS } from '@/lib/shop';
import { Icons } from '@/components/design';
import { PawIcon } from '@/components/design/nav-icons';
import { PetSheet } from './PetSheet';

/** Natural-language queries get a Mylo answer on the results page; plain product names just search. */
export const looksLikeQuestion = (q: string) =>
  /\?|\b(my|for|help|best|what|which|how|should|need|suggest|recommend|good|vs|versus|itch|scratch|tick|flea|smell|shed|dandruff|puppy|kitten|senior|joint|vomit|loose|diet)\b/i.test(q) || q.trim().split(/\s+/).length >= 4;

/** Amazon-style sticky header: logo + search bar (Mylo built in) + deliver-to strip + category strip. */
export default function Header({ categories = true, initial = '' }: { categories?: boolean; initial?: string }) {
  const router = useRouter();
  const path = usePathname();
  const { pet, session } = useShop();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [sugg, setSugg] = useState<Product[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [petOpen, setPetOpen] = useState(false);
  const [pin, setPin] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [top, setTop] = useState(110);

  useEffect(() => { setQ(initial); }, [initial]);
  useEffect(() => {
    setRecent(readLS<string[]>('mp_recent_q', [])); setPin(readLS<{ pincode?: string } | null>('mp_addr', null)?.pincode ?? '');
    if (open && formRef.current) setTop(formRef.current.getBoundingClientRect().bottom);
  }, [open]);

  // Live product suggestions while typing.
  useEffect(() => {
    const t = q.trim();
    if (!open || t.length < 2) { setSugg([]); return; }
    const id = setTimeout(async () => {
      const { data } = await supabase.rpc('search_products', { search_query: t, result_limit: 6 });
      let rows = data ?? [];
      if (!rows.length) rows = (await supabase.from('shop_products').select(PRODUCT_COLS).ilike('title', `%${t.replace(/[%_,()]/g, ' ')}%`).limit(6)).data ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSugg((rows as any[]).map(toProduct));
    }, 200);
    return () => clearTimeout(id);
  }, [q, open]);

  const go = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    writeLS('mp_recent_q', [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 6));
    setOpen(false); inputRef.current?.blur();
    router.push(`/s?k=${encodeURIComponent(t)}`);
  };

  const catHit = q.trim().length >= 2 ? CATEGORIES.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 2) : [];

  return (
    <>
      <header className="sticky top-0 z-30 bg-plum pt-[env(safe-area-inset-top)] text-white">
        <div className="flex items-center gap-2 px-3 pb-2 pt-2.5">
          <Link href="/" className="shrink-0 text-[20px] font-extrabold tracking-[-0.5px]" aria-label="Mylopaws home">mylo<span className="text-butter">paws</span></Link>
          <span className="ml-auto" />
          {!session && path !== '/login' && <Link href="/login" className="text-[13px] font-semibold">Sign in ›</Link>}
        </div>
        <form ref={formRef} onSubmit={(e) => { e.preventDefault(); go(q); }} className="px-3 pb-2.5" role="search">
          <div className="flex h-11 items-center overflow-hidden rounded-[10px] bg-white text-ink shadow-card focus-within:ring-2 focus-within:ring-butter">
            <Icons.Search className="ml-3 h-5 w-5 shrink-0 text-muted" />
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)}
              placeholder="Search or ask Mylo: “tick care for 15 kg dog”" aria-label="Search products or ask Mylo" enterKeyHint="search"
              className="h-full min-w-0 flex-1 bg-transparent px-2 text-[15px] outline-none placeholder:text-[13px] placeholder:text-muted" />
            {q && <button type="button" aria-label="Clear" onClick={() => { setQ(''); inputRef.current?.focus(); }} className="flex h-11 w-9 items-center justify-center text-muted"><Icons.Close className="h-4 w-4" /></button>}
            <button type="submit" aria-label="Search" className="flex h-11 w-12 items-center justify-center bg-butter text-plum"><Icons.Search className="h-5 w-5" /></button>
          </div>
        </form>
        <button type="button" onClick={() => setPetOpen(true)} className="flex w-full items-center gap-1.5 bg-plum-dark px-3 py-2 text-left text-[12.5px]">
          <span aria-hidden>📍</span>
          <span className="truncate">Deliver to {pet?.name ? `${pet.name}’s home` : 'Bengaluru'}{pin ? ` · ${pin}` : ''}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1 font-semibold text-butter">
            {pet ? `${pet.species === 'cat' ? '🐱' : '🐶'} ${pet.name}${pet.weight_kg ? ` ${pet.weight_kg}kg` : ''}` : '🐾 Add your pet'} <Icons.ChevronDown className="h-3.5 w-3.5" />
          </span>
        </button>
        {categories && (
          <nav aria-label="Categories" className="flex gap-4 overflow-x-auto whitespace-nowrap bg-white px-3 py-2 text-[13px] font-semibold text-ink shadow-[0_1px_0_#E5E5E5]">
            <Link href="/s?k=deals&sort=save" className="text-danger">Deals</Link>
            <Link href="/orders">Buy again</Link>
            {CATEGORIES.map((c) => <Link key={c.name} href={`/s?c=${encodeURIComponent(c.name)}`}>{c.name}</Link>)}
          </nav>
        )}
      </header>

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] overflow-y-auto bg-white pb-24 shadow-floating" style={{ top }}>
          <div className="flex justify-end px-3 pt-2"><button type="button" onClick={() => setOpen(false)} className="text-[13px] font-semibold text-plum">Close</button></div>
          {q.trim().length >= 2 && (
            <button type="button" onClick={() => go(q)} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-plum text-white"><PawIcon className="h-[18px] w-[18px]" /></span>
              <span className="min-w-0 text-[14px] text-ink"><b>Ask Mylo:</b> “{q.trim()}”<span className="block text-[12px] text-muted">Best picks with a short answer</span></span>
            </button>
          )}
          {catHit.map((c) => (
            <Link key={c.name} href={`/s?c=${encodeURIComponent(c.name)}`} onClick={() => setOpen(false)} className="flex items-center gap-3 border-b border-line px-4 py-3 text-[14px] text-ink">
              <span aria-hidden>{c.emoji}</span> in <b>{c.name}</b>
            </Link>
          ))}
          {sugg.map((p) => (
            <Link key={p.handle} href={`/p/${p.handle}`} onClick={() => setOpen(false)} className="flex items-center gap-3 border-b border-line px-4 py-2.5 text-[14px] text-ink">
              <Icons.Search className="h-4 w-4 shrink-0 text-muted" /><span className="line-clamp-1">{p.title}</span>
            </Link>
          ))}
          {q.trim().length < 2 && (
            <div className="px-4 pt-2">
              {recent.length > 0 && (
                <>
                  <p className="text-[12px] font-bold uppercase tracking-wide text-muted">Recent</p>
                  {recent.map((r) => <button key={r} type="button" onClick={() => go(r)} className="flex w-full items-center gap-3 py-2.5 text-left text-[14px] text-ink"><Icons.Clock className="h-4 w-4 text-muted" />{r}</button>)}
                </>
              )}
              <p className="mt-3 text-[12px] font-bold uppercase tracking-wide text-muted">Ask Mylo about</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PROBLEMS.map((p) => <button key={p.label} type="button" onClick={() => go(p.prompt)} className="min-h-[38px] rounded-full border border-line px-3 text-[13px] font-semibold text-body">{p.emoji} {p.label}</button>)}
              </div>
            </div>
          )}
        </div>
      )}
      <PetSheet open={petOpen} onClose={() => setPetOpen(false)} />
    </>
  );
}

/** Reads ?k= for pages that show the header with the current query. */
export function useQueryParam(name: string) {
  const sp = useSearchParams();
  return sp.get(name) ?? '';
}
