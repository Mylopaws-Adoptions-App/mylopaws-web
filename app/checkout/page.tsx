'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { toast } from '@/lib/toast';
import { useShop } from '@/components/shop/ShopProvider';
import { ProductImage } from '@/components/shop/Product';
import PhoneAuthSheet from '@/components/PhoneAuthSheet';
import { Field, Icons, PillButton } from '@/components/design';
import { ShopError, fileToUpload, inr, payShopOrder, readLS, shopFn, writeLS } from '@/lib/shop';

type Addr = { line1: string; landmark: string; pincode: string };
type Done = { order_number: number; total: number; promised: string | null; pickup: boolean; rx: boolean };

// Amazon-style checkout: 1 Delivery address (or store pickup) · 2 Prescription (if needed) · 3 Review items · Place order & pay.
export default function Checkout() {
  const router = useRouter();
  const { cart, subtotal, clear, delivery, nextRun, session, authReady, support } = useShop();
  const [ful, setFul] = useState<'delivery' | 'pickup'>('delivery');
  const [name, setName] = useState('');
  const [addr, setAddr] = useState<Addr>({ line1: '', landmark: '', pincode: '' });
  const [editAddr, setEditAddr] = useState(true);
  const [saved, setSaved] = useState<{ id: string; label: string; address_text: string }[]>([]);
  const [rxFile, setRxFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const resume = useRef(false);

  useEffect(() => {
    const a = readLS<Addr | null>('mp_addr', null);
    if (a?.line1) { setAddr(a); setEditAddr(false); }
    setName(readLS<string>('mp_name', ''));
    setFul(readLS<'delivery' | 'pickup'>('mp_ful', 'delivery'));
  }, []);
  useEffect(() => { if (authReady && !session && cart.length) setAuthOpen(true); }, [authReady, session, cart.length]);
  useEffect(() => {
    if (!session) return;
    supabase.from('customers').select('name').eq('id', session.user.id).single().then(({ data }) => { if (data?.name) setName((n) => n || data.name); });
    supabase.from('addresses').select('id, label, address_text').eq('customer_id', session.user.id).limit(5).then(({ data }) => setSaved(data ?? []));
  }, [session]);

  const needsRx = cart.some((l) => l.product.rx);
  const fee = ful === 'delivery' && subtotal < delivery.free_min ? delivery.fee : 0;
  const total = subtotal + fee;

  const validate = () => {
    if (!cart.length) return 'Your cart is empty';
    if (name.trim().length < 2) return 'Please add the name for the order';
    if (ful === 'delivery') {
      if (addr.line1.trim().length < 8) return 'Please add your full address (house, street, area)';
      if (!/^56\d{4}$/.test(addr.pincode)) return 'We deliver within Bangalore only (pincodes starting 56)';
    }
    if (needsRx && !rxFile) return 'Please upload the vet prescription';
    if (cart.some((l) => l.product.vaccine || !l.product.in_stock)) return 'Some items can’t be ordered. Go back to the cart to remove them.';
    return '';
  };

  async function place() {
    const v = validate();
    if (v) { setErr(v); return; }
    setErr('');
    writeLS('mp_addr', addr); writeLS('mp_name', name.trim()); writeLS('mp_ful', ful);
    if (!session) { resume.current = true; setAuthOpen(true); return; }
    setBusy(true);
    track('begin_checkout', { value: total, items: cart.length });
    try {
      let rxId: string | undefined;
      if (needsRx && rxFile) {
        const up = await fileToUpload(rxFile);
        rxId = (await shopFn<{ rx_id: string }>('rx_upload', { file_b64: up.b64, mime: up.mime, name: name.trim(), items: cart.filter((l) => l.product.rx).map((l) => l.product.title) })).rx_id;
      }
      const o = await shopFn('checkout', { name: name.trim(), fulfilment: ful, address: ful === 'delivery' ? addr : undefined, items: cart.map((l) => ({ handle: l.handle, qty: l.qty })), rx_id: rxId });
      const outcome = await payShopOrder(o);
      if (outcome === 'paid') {
        track('purchase', { value: o.amount, transaction_id: String(o.order_number) });
        setDone({ order_number: o.order_number, total: o.amount, promised: o.promised_label, pickup: ful === 'pickup', rx: needsRx });
        clear(); window.scrollTo({ top: 0 });
      } else if (outcome === 'unverified') {
        toast('Payment is being confirmed. Check Your Orders in a minute.', 'info'); router.push('/orders');
      } else toast('Payment not completed. Your cart is saved.', 'info');
    } catch (e) {
      const se = e as ShopError;
      if (se.code === 'signin') { resume.current = true; setAuthOpen(true); } else setErr(se.message);
    } finally { setBusy(false); }
  }
  useEffect(() => { if (session && resume.current) { resume.current = false; place(); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [session]);

  const Bar = (
    <div className="sticky top-0 z-30 flex items-center gap-2 bg-plum px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white">
      <button type="button" onClick={() => router.back()} aria-label="Back" className="flex h-9 w-9 items-center justify-center"><Icons.ChevronLeft className="h-6 w-6" /></button>
      <span className="text-[18px] font-bold">{done ? 'Order placed' : 'Checkout'}</span>
      <span className="ml-auto text-[12px] text-white/80">🔒 Secure</span>
    </div>
  );

  if (done) {
    return (
      <div className="mx-auto min-h-screen max-w-[480px] bg-[#FAF8F9] pb-28">
        {Bar}
        <div className="m-3 rounded-2xl border border-[#EEE7EB] bg-white p-5">
          <p className="flex items-center gap-2 text-[18px] font-bold text-success"><Icons.Check className="h-6 w-6" /> Order placed, thank you!</p>
          <p className="mt-2 text-[14px] text-body">Order <b>#{done.order_number}</b> · {inr(done.total)} paid</p>
          <p className="mt-1 text-[14px] text-body">{done.pickup ? 'We’ll WhatsApp you when it’s ready to collect from our HSR Layout store.' : <>Arriving <b>{done.promised ?? 'on the next run'}</b>, {delivery.window}. Updates on WhatsApp.</>}</p>
          {done.rx && <p className="mt-1 text-[13px] text-muted">Our team checks your prescription before packing.</p>}
          <div className="mt-4 space-y-2">
            <PillButton onClick={() => router.push('/orders')}>Review or track your order</PillButton>
            <PillButton variant="secondary" onClick={() => router.push('/')}>Continue shopping</PillButton>
          </div>
        </div>
      </div>
    );
  }

  if (!cart.length) {
    return <div className="mx-auto min-h-screen max-w-[480px] bg-[#FAF8F9]">{Bar}<p className="p-6 text-center text-[14px] text-body">Your cart is empty. <Link href="/" className="font-semibold text-plum">Continue shopping</Link></p></div>;
  }

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#FAF8F9] pb-36">
      {Bar}
      <div className="space-y-3 p-3">
        <Step n={1} title="Delivery">
          <div className="grid grid-cols-2 gap-2">
            {(['delivery', 'pickup'] as const).filter((f) => f === 'delivery' || delivery.pickup_enabled).map((f) => (
              <button key={f} type="button" onClick={() => setFul(f)} aria-pressed={ful === f}
                className={`rounded-2xl border-2 p-3 text-left ${ful === f ? 'border-plum bg-plum-soft' : 'border-line'}`}>
                <span className="block text-[14px] font-bold text-ink">{f === 'delivery' ? '🚚 Home delivery' : '🏪 Store pickup'}</span>
                <span className="block text-[12px] text-muted">{f === 'delivery' ? (subtotal >= delivery.free_min ? 'FREE' : `${inr(delivery.fee)} · FREE over ${inr(delivery.free_min)}`) : 'FREE · HSR Layout'}</span>
              </button>
            ))}
          </div>
          <Field label="Name for the order" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" className="mt-3" />
          {ful === 'delivery' ? (
            !editAddr ? (
              <div className="rounded-2xl border border-line p-3 text-[14px] text-body">
                <p className="font-semibold text-ink">{name || 'Deliver to'}</p>
                <p>{addr.line1}{addr.landmark ? `, ${addr.landmark}` : ''}, Bengaluru {addr.pincode}</p>
                <button type="button" onClick={() => setEditAddr(true)} className="mt-1 text-[13px] font-semibold text-plum">Change</button>
              </div>
            ) : (
              <>
                {saved.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {saved.map((s) => (
                      <button key={s.id} type="button" onClick={() => setAddr({ line1: s.address_text, landmark: '', pincode: s.address_text.match(/\b56\d{4}\b/)?.[0] ?? '' })}
                        className="min-h-[36px] rounded-full border border-line px-3 text-[12px] font-semibold text-body">📍 {s.label}</button>
                    ))}
                  </div>
                )}
                <Field label="Address" value={addr.line1} onChange={(e) => setAddr((a) => ({ ...a, line1: e.target.value }))} placeholder="Flat / house, street, area" autoComplete="street-address" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Landmark" value={addr.landmark} onChange={(e) => setAddr((a) => ({ ...a, landmark: e.target.value }))} placeholder="Optional" />
                  <Field label="Pincode" inputMode="numeric" maxLength={6} value={addr.pincode} onChange={(e) => setAddr((a) => ({ ...a, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="5600xx" autoComplete="postal-code" />
                </div>
              </>
            )
          ) : <p className="text-[13px] text-body">Collect from <b>764/A, 22nd Cross, Parangipalya Main Road, HSR Layout</b>. We’ll WhatsApp you when it’s ready.</p>}
          <p className="mt-2 text-[12px] text-muted">{session ? `Updates on WhatsApp to +${session.user.phone}` : 'You’ll confirm your phone with a one-time code.'}</p>
        </Step>

        {needsRx && (
          <Step n={2} title="Vet prescription">
            <p className="text-[13px] leading-[1.5] text-body">For {cart.filter((l) => l.product.rx).map((l) => l.product.title).join(', ')}. A clear photo or PDF with your pet’s name, the medicine and the vet’s signature.</p>
            <label className="mt-2 flex min-h-[46px] cursor-pointer items-center justify-center rounded-full border-[1.5px] border-dashed border-plum text-[14px] font-bold text-plum">
              {rxFile ? `✓ ${rxFile.name.slice(0, 28)}` : 'Upload photo or PDF'}
              <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { if (f.size > 8 * 1024 * 1024) { setErr('File must be under 8 MB'); return; } setRxFile(f); setErr(''); } }} />
            </label>
          </Step>
        )}

        <Step n={needsRx ? 3 : 2} title="Review items">
          <p className="text-[14px] font-bold text-success">{ful === 'pickup' ? 'Ready for pickup soon' : `Arriving ${nextRun || 'on the next run'}`}</p>
          <p className="text-[12px] text-muted">{ful === 'pickup' ? 'We’ll message you when it’s packed.' : `Evening run ${delivery.window}. Pay before ${delivery.cutoff_hour > 12 ? delivery.cutoff_hour - 12 + ' pm' : delivery.cutoff_hour + ' am'} for the same-day run.`}</p>
          <div className="mt-2 divide-y divide-line">
            {cart.map((l) => (
              <div key={l.handle} className="flex items-center gap-3 py-2">
                <ProductImage p={l.product} className="h-14 w-14 shrink-0" sizes="56px" />
                <div className="min-w-0 flex-1"><p className="line-clamp-2 text-[13px] text-ink">{l.product.title}</p><p className="text-[12px] text-muted">Qty {l.qty}</p></div>
                <span className="text-[14px] font-bold">{inr(l.qty * l.product.price)}</span>
              </div>
            ))}
          </div>
          <Link href="/cart" className="text-[13px] font-semibold text-plum">Change items</Link>
        </Step>

        <section className="rounded-2xl border border-[#EEE7EB] bg-white p-4 text-[14px]">
          <div className="flex justify-between"><span className="text-muted">Items</span><span>{inr(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Delivery</span><span>{fee ? inr(fee) : 'FREE'}</span></div>
          <div className="mt-2 flex justify-between border-t border-line pt-2 text-[17px] font-bold text-ink"><span>Order total</span><span>{inr(total)}</span></div>
          <p className="mt-2 text-[11px] text-muted">By placing your order you agree to our <Link href="/terms" className="underline">conditions</Link> and <Link href="/cancellation" className="underline">cancellation policy</Link>. Help: <a href={`https://wa.me/${support}`} className="underline" target="_blank" rel="noreferrer">WhatsApp</a>.</p>
        </section>
      </div>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-[#EEE7EB] bg-white/95 px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)] backdrop-blur">
        {err && <p className="mb-1.5 text-[13px] font-medium text-danger" role="alert">{err}</p>}
        <button type="button" onClick={place} disabled={busy}
          className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-plum text-[16px] font-semibold text-white disabled:opacity-60">
          {busy ? 'Placing order…' : session ? `Place order & pay ${inr(total)}` : 'Sign in to place order'}
        </button>
      </div>

      <PhoneAuthSheet open={authOpen} title="Sign in to check out" onClose={() => { setAuthOpen(false); resume.current = false; }} onVerified={() => setAuthOpen(false)} />
    </div>
  );
}

// Defined at module level so inputs inside keep focus while typing.
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#EEE7EB] bg-white p-4">
      <h2 className="text-[16px] font-bold text-ink"><span className="mr-2 text-muted">{n}</span>{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
