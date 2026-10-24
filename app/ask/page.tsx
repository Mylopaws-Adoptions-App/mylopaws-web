'use client';
import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { useShop } from '@/components/shop/ShopProvider';
import { PetPill } from '@/components/shop/PetSheet';
import { AddControl, Price, ProductImage, ProductRow } from '@/components/shop/Product';
import PhoneAuthSheet from '@/components/PhoneAuthSheet';
import { PawIcon, SendIcon } from '@/components/design/nav-icons';
import { Icons } from '@/components/design';
import { PROBLEMS, Product, chatSid, inr, readLS, shopFn, writeLS } from '@/lib/shop';

type Card =
  | { type: 'products'; heading?: string; items: Product[] }
  | { type: 'compare'; items: (Product & { about?: string })[] }
  | { type: 'cart' } | { type: 'checkout' } | { type: 'orders' } | { type: 'signin' }
  | { type: 'whatsapp'; url: string; label: string };
type Msg = { id: string; role: 'user' | 'mylo'; text: string; cards?: Card[]; error?: boolean };

const KEY = 'mp_chat_msgs';

function AskInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { cart, setQty, pet } = useShop();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState<{ handle: string; title: string } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const boot = useRef(false);

  // Restore the conversation, pick up ?product= and ?q= once.
  useEffect(() => {
    if (boot.current) return;
    boot.current = true;
    const saved = readLS<Msg[]>(KEY, []);
    setMsgs(saved);
    const ph = sp.get('product');
    if (ph) supabase.from('shop_products').select('handle, title').eq('handle', ph).maybeSingle().then(({ data }) => data && setFocus(data));
    const q = sp.get('q');
    if (q) { router.replace('/ask', { scroll: false }); setTimeout(() => send(q, saved, ph ?? undefined), 50); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, busy]);

  const persist = (m: Msg[]) => { setMsgs(m); writeLS(KEY, m.slice(-40)); };

  async function send(raw: string, base?: Msg[], productHandle?: string) {
    const t = raw.trim();
    if (!t || busy) return;
    const start = [...(base ?? msgs), { id: crypto.randomUUID(), role: 'user' as const, text: t }];
    persist(start);
    setText(''); setBusy(true);
    track('ask_mylo', { length: t.length });
    try {
      const r = await shopFn<{ reply: string; cards: Card[]; cart_ops: { handle: string; qty: number; product: Product }[] }>('chat', {
        sid: chatSid(), text: t, cart: cart.map((l) => ({ handle: l.handle, qty: l.qty })),
        pet: pet ?? undefined, product: productHandle ?? focus?.handle,
      });
      for (const op of r.cart_ops ?? []) setQty(op.product, op.qty);
      persist([...start, { id: crypto.randomUUID(), role: 'mylo', text: r.reply, cards: r.cards ?? [] }]);
    } catch (e) {
      persist([...start, { id: crypto.randomUUID(), role: 'mylo', text: (e as Error).message || 'Sorry, something went wrong. Please try again.', error: true }]);
    } finally { setBusy(false); }
  }

  const reset = () => { persist([]); setFocus(null); try { localStorage.removeItem('mp_chat_sid'); } catch { /* ignore */ } };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[480px] flex-col bg-white">
      <header className="sticky top-0 z-20 bg-plum px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-plum"><PawIcon className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-bold leading-tight">Mylo</p>
            <p className="text-[12px] text-white/80">Your pet shopping assistant</p>
          </div>
          {msgs.length > 0 && <button type="button" onClick={reset} className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-bold">New chat</button>}
        </div>
        <div className="mt-2.5"><PetPill onDark /></div>
      </header>

      <main className="flex-1 px-4 pb-[calc(150px_+_env(safe-area-inset-bottom))] pt-4">
        {msgs.length === 0 && (
          <div className="mp-fade">
            <div className="rounded-card bg-butter p-4">
              <p className="text-[15px] font-bold text-ink">Hi! I’m Mylo 🐾</p>
              <p className="mt-1 text-[14px] leading-[1.5] text-body">Tell me what’s going on with your pet, or name a product. I’ll show options, compare them and fill your cart. You review and pay at checkout.</p>
            </div>
            <p className="mt-5 text-[13px] font-semibold text-muted">Try one of these</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PROBLEMS.slice(0, 6).map((p) => (
                <button key={p.label} type="button" onClick={() => send(p.prompt)} className="min-h-[40px] rounded-full border border-line bg-white px-3.5 text-[13px] font-semibold text-body active:scale-95">
                  {p.emoji} {p.label}
                </button>
              ))}
              <button type="button" onClick={() => send('Where is my order?')} className="min-h-[40px] rounded-full border border-line bg-white px-3.5 text-[13px] font-semibold text-body active:scale-95">📦 Where is my order?</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {msgs.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : ''}>
              {m.role === 'user' ? (
                <p className="max-w-[82%] whitespace-pre-wrap rounded-[20px] rounded-br-md bg-plum px-4 py-2.5 text-[14px] leading-[1.5] text-white">{m.text}</p>
              ) : (
                <div className="space-y-2.5">
                  {m.text && <p className={`max-w-[90%] whitespace-pre-wrap rounded-[20px] rounded-bl-md px-4 py-2.5 text-[14px] leading-[1.55] ${m.error ? 'bg-danger/10 text-danger' : 'bg-surface-alt text-body'}`}>{m.text}</p>}
                  {(m.cards ?? []).map((c, i) => <CardView key={i} c={c} onSignin={() => setAuthOpen(true)} />)}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="inline-flex items-center gap-1.5 rounded-[20px] bg-surface-alt px-4 py-3" role="status" aria-label="Mylo is typing">
              {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-plum/60" style={{ animationDelay: `${i * 120}ms` }} />)}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </main>

      <div className="fixed bottom-[calc(56px_+_env(safe-area-inset-bottom))] left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-white px-3 pb-2.5 pt-2">
        {focus && (
          <div className="mb-2 flex items-center gap-2 rounded-full bg-plum-soft px-3 py-1.5 text-[12px] text-plum">
            <span className="min-w-0 flex-1 truncate">Asking about: <b>{focus.title}</b></span>
            <button type="button" onClick={() => setFocus(null)} aria-label="Stop asking about this product"><Icons.Close className="h-4 w-4" /></button>
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about products, sizes, delivery…" aria-label="Message Mylo" maxLength={800}
            className="min-h-[48px] flex-1 rounded-full border border-line bg-surface-alt px-4 text-[15px] text-ink outline-none placeholder:text-muted focus:border-plum" />
          <button type="submit" disabled={!text.trim() || busy} aria-label="Send"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-plum text-white disabled:bg-[#DEDEDE] disabled:text-[#9A9A9A]">
            <SendIcon className="h-5 w-5" />
          </button>
        </form>
      </div>

      <PhoneAuthSheet open={authOpen} onClose={() => setAuthOpen(false)} onVerified={() => setAuthOpen(false)} />
    </div>
  );
}

function CardView({ c, onSignin }: { c: Card; onSignin: () => void }) {
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
                <Link href={`/p/${p.handle}`} className="mt-2 line-clamp-2 text-[12.5px] font-semibold leading-tight text-ink">{p.title}</Link>
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
          <div className="mt-2 flex justify-between border-t border-line pt-2 text-[13px]"><span className="text-muted">Delivery</span><span>{fee ? inr(fee) : 'Free'}</span></div>
          <div className="flex justify-between text-[15px] font-bold text-plum"><span>Total</span><span>{inr(subtotal + fee)}</span></div>
          <Link href="/cart" className="mt-3 flex min-h-[48px] items-center justify-center rounded-full bg-plum text-[15px] font-bold text-white">{c.type === 'checkout' ? 'Review & pay' : 'Go to cart'}</Link>
        </div>
      );
    }
    case 'orders':
      return <Link href="/orders" className="flex min-h-[48px] items-center justify-center rounded-full border-[1.5px] border-plum text-[14px] font-bold text-plum">Open my orders</Link>;
    case 'signin':
      return <button type="button" onClick={onSignin} className="flex min-h-[48px] w-full items-center justify-center rounded-full bg-plum text-[14px] font-bold text-white">Sign in with your phone</button>;
    case 'whatsapp':
      return <a href={c.url} target="_blank" rel="noreferrer" className="flex min-h-[48px] items-center justify-center rounded-full bg-success text-[14px] font-bold text-white">💬 {c.label}</a>;
  }
  return null;
}

export default function AskPage() {
  return <Suspense fallback={null}><AskInner /></Suspense>;
}
