'use client';
import Link from 'next/link';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { useShop } from './ShopProvider';
import { AddControl, Price, ProductImage, ProductRow } from './Product';
import PhoneAuthSheet from '@/components/PhoneAuthSheet';
import { PawIcon, SendIcon } from '@/components/design/nav-icons';
import { Icons, Portal } from '@/components/design';
import { PROBLEMS, Product, chatSid, inr, readLS, shopFn, writeLS } from '@/lib/shop';

type Card =
  | { type: 'products'; heading?: string; items: Product[] }
  | { type: 'compare'; items: (Product & { about?: string })[] }
  | { type: 'cart' } | { type: 'checkout' } | { type: 'orders' } | { type: 'signin' }
  | { type: 'whatsapp'; url: string; label: string };
type Msg = { id: string; role: 'user' | 'mylo'; text: string; cards?: Card[]; error?: boolean };
const KEY = 'mp_chat_msgs';

// ── global "Ask Mylo" sheet (Rufus-style), opened from the search results, product pages and cart ──
type Open = { prompt?: string; product?: { handle: string; title: string } };
const Ctx = createContext<{ openMylo: (o?: Open) => void }>({ openMylo: () => {} });
export const useMylo = () => useContext(Ctx);

export function MyloProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  return (
    <Ctx.Provider value={{ openMylo: (o) => setOpen(o ?? {}) }}>
      {children}
      {open && (
        <Portal>
          <div className="fixed inset-0 z-50 flex justify-center bg-black/40" onClick={() => setOpen(null)}>
            <div className="mp-search-in mt-[6vh] flex h-[94dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[24px] bg-white" onClick={(e) => e.stopPropagation()}>
              <MyloChat key={JSON.stringify(open)} prompt={open.prompt} product={open.product} onClose={() => setOpen(null)} />
            </div>
          </div>
        </Portal>
      )}
    </Ctx.Provider>
  );
}

/** The Mylo conversation: same brain as the WhatsApp shop bot; answers carry product cards and cart actions. */
export default function MyloChat({ prompt, product, onClose, fullPage }: { prompt?: string; product?: { handle: string; title: string }; onClose?: () => void; fullPage?: boolean }) {
  const { cart, setQty, pet } = useShop();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState(product ?? null);
  const [authOpen, setAuthOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const boot = useRef(false);

  useEffect(() => {
    if (boot.current) return;
    boot.current = true;
    const saved = readLS<Msg[]>(KEY, []);
    setMsgs(saved);
    if (prompt) setTimeout(() => send(prompt, saved), 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, busy]);

  const persist = (m: Msg[]) => { setMsgs(m); writeLS(KEY, m.slice(-40)); };

  async function send(raw: string, base?: Msg[]) {
    const t = raw.trim();
    if (!t || busy) return;
    const start = [...(base ?? msgs), { id: crypto.randomUUID(), role: 'user' as const, text: t }];
    persist(start); setText(''); setBusy(true);
    track('ask_mylo', { length: t.length });
    try {
      const r = await shopFn<{ reply: string; cards: Card[]; cart_ops: { handle: string; qty: number; product: Product }[] }>('chat', {
        sid: chatSid(), text: t, cart: cart.map((l) => ({ handle: l.handle, qty: l.qty })), pet: pet ?? undefined, product: focus?.handle,
      });
      for (const op of r.cart_ops ?? []) setQty(op.product, op.qty);
      persist([...start, { id: crypto.randomUUID(), role: 'mylo', text: r.reply, cards: r.cards ?? [] }]);
    } catch (e) {
      persist([...start, { id: crypto.randomUUID(), role: 'mylo', text: (e as Error).message || 'Sorry, something went wrong. Please try again.', error: true }]);
    } finally { setBusy(false); }
  }

  const reset = () => { persist([]); setFocus(null); try { localStorage.removeItem('mp_chat_sid'); } catch { /* ignore */ } };
  const starters = focus
    ? [`Is ${focus.title.split(' - ')[0]} right for my pet?`, 'How is it used?', 'Any cheaper alternatives?', 'Compare with similar products']
    : PROBLEMS.slice(0, 6).map((p) => p.prompt);

  return (
    <div className={`flex flex-col bg-white ${fullPage ? 'min-h-[100dvh]' : 'h-full'}`}>
      <div className={`flex items-center gap-3 bg-plum px-4 pb-3 text-white ${fullPage ? 'sticky top-0 z-20 pt-[calc(0.75rem+env(safe-area-inset-top))]' : 'pt-3'}`}>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-plum"><PawIcon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-bold leading-tight">Ask Mylo</p>
          <p className="text-[12px] text-white/80">AI shopping assistant · answers can be wrong, check labels</p>
        </div>
        {msgs.length > 0 && <button type="button" onClick={reset} className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-bold">New</button>}
        {onClose && <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center"><Icons.Close className="h-5 w-5" /></button>}
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto px-4 pt-4 ${fullPage ? 'pb-[calc(150px_+_env(safe-area-inset-bottom))]' : 'pb-4'}`}>
        {msgs.length === 0 && (
          <div className="mp-fade">
            <p className="text-[14px] leading-[1.55] text-body">{focus ? <>Ask anything about <b>{focus.title}</b>.</> : 'Tell me what’s going on with your pet, or name a product. I’ll show options, compare them and add them to your cart.'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {starters.map((s) => <button key={s} type="button" onClick={() => send(s)} className="min-h-[38px] rounded-full border border-plum/30 bg-plum-soft px-3 text-left text-[13px] font-semibold text-plum">{s}</button>)}
            </div>
          </div>
        )}
        <div className="space-y-3">
          {msgs.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : ''}>
              {m.role === 'user' ? (
                <p className="max-w-[82%] whitespace-pre-wrap rounded-[18px] rounded-br-md bg-plum px-4 py-2.5 text-[14px] leading-[1.5] text-white">{m.text}</p>
              ) : (
                <div className="space-y-2.5">
                  {m.text && <p className={`max-w-[92%] whitespace-pre-wrap rounded-[18px] rounded-bl-md px-4 py-2.5 text-[14px] leading-[1.55] ${m.error ? 'bg-danger/10 text-danger' : 'bg-surface-alt text-body'}`}>{m.text}</p>}
                  {(m.cards ?? []).map((c, i) => <CardView key={i} c={c} onSignin={() => setAuthOpen(true)} onNavigate={onClose} />)}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="inline-flex items-center gap-1.5 rounded-[18px] bg-surface-alt px-4 py-3" role="status" aria-label="Mylo is typing">
              {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-plum/60" style={{ animationDelay: `${i * 120}ms` }} />)}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className={`border-t border-line bg-white px-3 pb-2.5 pt-2 ${fullPage ? 'fixed bottom-[calc(56px_+_env(safe-area-inset-bottom))] left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2' : 'pb-[calc(0.75rem+env(safe-area-inset-bottom))]'}`}>
        {focus && (
          <div className="mb-2 flex items-center gap-2 rounded-full bg-plum-soft px-3 py-1.5 text-[12px] text-plum">
            <span className="min-w-0 flex-1 truncate">About: <b>{focus.title}</b></span>
            <button type="button" onClick={() => setFocus(null)} aria-label="Stop asking about this product"><Icons.Close className="h-4 w-4" /></button>
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about products, sizes, delivery…" aria-label="Message Mylo" maxLength={800}
            className="min-h-[46px] flex-1 rounded-full border border-line bg-surface-alt px-4 text-[15px] text-ink outline-none placeholder:text-muted focus:border-plum" />
          <button type="submit" disabled={!text.trim() || busy} aria-label="Send"
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-plum text-white disabled:bg-[#DEDEDE] disabled:text-[#9A9A9A]">
            <SendIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
      <PhoneAuthSheet open={authOpen} onClose={() => setAuthOpen(false)} onVerified={() => setAuthOpen(false)} />
    </div>
  );
}

function CardView({ c, onSignin, onNavigate }: { c: Card; onSignin: () => void; onNavigate?: () => void }) {
  const { cart, subtotal, delivery } = useShop();
  switch (c.type) {
    case 'products':
      return (
        <div className="space-y-2">
          {c.heading && <p className="px-1 text-[13px] font-bold text-ink">{c.heading}</p>}
          {c.items.map((p) => <ProductRow key={p.handle} p={p} />)}
        </div>
      );
    case 'compare':
      return (
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="grid min-w-max auto-cols-[150px] grid-flow-col gap-2">
            {c.items.map((p) => (
              <div key={p.handle} className="flex flex-col rounded-card border border-line bg-white p-2.5 shadow-card">
                <ProductImage p={p} className="aspect-square w-full" sizes="150px" />
                <Link href={`/p/${p.handle}`} onClick={onNavigate} className="mt-2 line-clamp-2 text-[12.5px] font-semibold leading-tight text-ink">{p.title}</Link>
                <div className="mt-1"><Price p={p} /></div>
                {p.about && <p className="mt-1 line-clamp-4 flex-1 text-[11.5px] leading-[1.45] text-muted">{p.about}</p>}
                <div className="mt-2"><AddControl p={p} full /></div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'cart':
    case 'checkout': {
      if (!cart.length) return null;
      const fee = subtotal < delivery.free_min ? delivery.fee : 0;
      return (
        <div className="rounded-card border border-line bg-white p-4 shadow-card">
          <p className="text-[14px] font-bold text-ink">{c.type === 'checkout' ? 'Ready to check out' : 'Your cart'}</p>
          <ul className="mt-2 space-y-1 text-[13px] text-body">
            {cart.map((l) => <li key={l.handle} className="flex justify-between gap-3"><span className="truncate">{l.qty} × {l.product.title}</span><span className="shrink-0 font-semibold">{inr(l.qty * l.product.price)}</span></li>)}
          </ul>
          <div className="mt-2 flex justify-between border-t border-line pt-2 text-[13px]"><span className="text-muted">Delivery</span><span>{fee ? inr(fee) : 'FREE'}</span></div>
          <div className="flex justify-between text-[15px] font-bold text-ink"><span>Total</span><span>{inr(subtotal + fee)}</span></div>
          <Link href={c.type === 'checkout' ? '/checkout' : '/cart'} onClick={onNavigate} className="mt-3 flex min-h-[46px] items-center justify-center rounded-full bg-butter text-[15px] font-bold text-ink">{c.type === 'checkout' ? 'Proceed to Buy' : 'Go to Cart'}</Link>
        </div>
      );
    }
    case 'orders':
      return <Link href="/orders" onClick={onNavigate} className="flex min-h-[46px] items-center justify-center rounded-full border-[1.5px] border-plum text-[14px] font-bold text-plum">Your Orders</Link>;
    case 'signin':
      return <button type="button" onClick={onSignin} className="flex min-h-[46px] w-full items-center justify-center rounded-full bg-plum text-[14px] font-bold text-white">Sign in with your phone</button>;
    case 'whatsapp':
      return <a href={c.url} target="_blank" rel="noreferrer" className="flex min-h-[46px] items-center justify-center rounded-full bg-success text-[14px] font-bold text-white">💬 {c.label}</a>;
  }
  return null;
}

/** Loads a product's handle + title for the sheet's "About:" chip. */
export async function productRef(handle: string) {
  const { data } = await supabase.from('shop_products').select('handle, title').eq('handle', handle).maybeSingle();
  return data as { handle: string; title: string } | null;
}
