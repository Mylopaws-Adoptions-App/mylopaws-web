'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { toast } from '@/lib/toast';
import { useShop } from '@/components/shop/ShopProvider';
import { AddControl, ProductRow } from '@/components/shop/Product';
import AskBar from '@/components/shop/AskBar';
import PhoneAuthSheet from '@/components/PhoneAuthSheet';
import { EmptyState, Field, Icons, PageShell, PillButton, Segmented } from '@/components/design';
import { PRODUCT_COLS, ShopError, fileToUpload, inr, payShopOrder, readLS, shopFn, toProduct, writeLS } from '@/lib/shop';

type Addr = { line1: string; landmark: string; pincode: string };
type Done = { order_number: number; total: number; promised: string | null; pickup: boolean };

export default function CartPage() {
  const router = useRouter();
  const { cart, subtotal, setQty, clear, delivery, nextRun, session, support } = useShop();
  const [ful, setFul] = useState<'delivery' | 'pickup'>('delivery');
  const [name, setName] = useState('');
  const [addr, setAddr] = useState<Addr>({ line1: '', landmark: '', pincode: '' });
  const [saved, setSaved] = useState<{ id: string; label: string; address_text: string }[]>([]);
  const [rxFile, setRxFile] = useState<File | null>(null);
  const [rxId, setRxId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const resume = useRef(false);
  const refreshed = useRef(false);

  // Re-read prices and stock once, so the cart never shows stale numbers.
  useEffect(() => {
    if (refreshed.current || !cart.length) return;
    refreshed.current = true;
    supabase.from('shop_products').select(PRODUCT_COLS).in('handle', cart.map((l) => l.handle)).then(({ data }) => {
      for (const row of data ?? []) { const p = toProduct(row); const l = cart.find((x) => x.handle === p.handle); if (l) setQty(p, l.qty); }
    });
  }, [cart, setQty]);

  useEffect(() => {
    const a = readLS<Addr | null>('mp_addr', null);
    if (a) setAddr(a);
    setName(readLS<string>('mp_name', ''));
    setFul(readLS<'delivery' | 'pickup'>('mp_ful', 'delivery'));
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.from('customers').select('name').eq('id', session.user.id).single().then(({ data }) => { if (data?.name) setName((n) => n || data.name); });
    supabase.from('addresses').select('id, label, address_text').eq('customer_id', session.user.id).limit(5).then(({ data }) => setSaved(data ?? []));
  }, [session]);

  const needsRx = cart.some((l) => l.product.rx);
  const blocked = cart.find((l) => l.product.vaccine || !l.product.in_stock);
  const fee = ful === 'delivery' && subtotal < delivery.free_min ? delivery.fee : 0;
  const total = subtotal + fee;
  const mrpTotal = cart.reduce((t, l) => t + l.qty * Math.max(l.product.mrp, l.product.price), 0);
  const gap = delivery.free_min - subtotal;

  const validate = () => {
    if (name.trim().length < 2) return 'Please enter your name';
    if (ful === 'delivery') {
      if (addr.line1.trim().length < 8) return 'Please enter your full address (house, street, area)';
      if (!/^56\d{4}$/.test(addr.pincode)) return 'We deliver within Bangalore only (pincodes starting 56)';
    }
    if (needsRx && !rxFile && !rxId) return 'Please add a photo or PDF of the vet prescription';
    if (blocked) return `${blocked.product.title} can’t be ordered online right now. Please remove it.`;
    return '';
  };

  async function pay() {
    const v = validate();
    if (v) { setErr(v); return; }
    setErr('');
    writeLS('mp_addr', addr); writeLS('mp_name', name.trim()); writeLS('mp_ful', ful);
    if (!session) { resume.current = true; setAuthOpen(true); return; }
    setBusy(true);
    track('begin_checkout', { value: total, items: cart.length });
    try {
      let rx = rxId;
      if (needsRx && !rx && rxFile) {
        const up = await fileToUpload(rxFile);
        const r = await shopFn<{ rx_id: string }>('rx_upload', { file_b64: up.b64, mime: up.mime, name: name.trim(), items: cart.filter((l) => l.product.rx).map((l) => l.product.title) });
        rx = r.rx_id; setRxId(rx);
      }
      const o = await shopFn('checkout', {
        name: name.trim(), fulfilment: ful, address: ful === 'delivery' ? addr : undefined,
        items: cart.map((l) => ({ handle: l.handle, qty: l.qty })), rx_id: rx ?? undefined,
      });
      setRxId(null); // a prescription is linked to one order
      const outcome = await payShopOrder(o);
      if (outcome === 'paid') {
        track('purchase', { value: o.amount, transaction_id: String(o.order_number) });
        setDone({ order_number: o.order_number, total: o.amount, promised: o.promised_label, pickup: ful === 'pickup' });
        clear();
        window.scrollTo({ top: 0 });
      } else if (outcome === 'unverified') {
        toast('Payment is being confirmed. Check Orders in a minute.', 'info');
        router.push('/orders');
      } else {
        toast('Payment not completed. Your cart is saved.', 'info');
      }
    } catch (e) {
      const se = e as ShopError;
      if (se.code === 'signin') { resume.current = true; setAuthOpen(true); }
      else setErr(se.message);
    } finally { setBusy(false); }
  }

  // Continue to payment straight after signing in.
  useEffect(() => { if (session && resume.current) { resume.current = false; pay(); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [session]);

  if (done) {
    return (
      <PageShell variant="plum" size="large" title="Order placed 🎉" subtitle={`Order #${done.order_number}`}>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success text-white"><Icons.Check className="h-10 w-10" /></div>
          <h2 className="mt-4 text-[20px] font-bold text-ink">Thank you! We’ve got it.</h2>
          <p className="mt-2 text-[14px] leading-[1.6] text-body">
            {done.pickup ? 'We’ll message you on WhatsApp when it’s ready to collect from our HSR Layout store.' : `Delivery ${done.promised ?? 'on the next run'}, ${delivery.window}. We’ll keep you posted on WhatsApp.`}
          </p>
          <div className="mt-6 w-full rounded-card bg-surface-alt p-4 text-left">
            <p className="text-[12px] font-bold uppercase tracking-wide text-muted">Amount paid</p>
            <p className="text-[28px] font-extrabold text-success">{inr(done.total)}</p>
            {needsRx && <p className="mt-1 text-[13px] text-body">Our team checks your prescription before packing.</p>}
          </div>
          <div className="mt-6 w-full space-y-2">
            <PillButton onClick={() => router.push('/orders')}>Track my order</PillButton>
            <PillButton variant="secondary" onClick={() => router.push('/')}>Keep shopping</PillButton>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!cart.length) {
    return (
      <PageShell variant="plum" size="large" title="Cart" onBack={() => router.back()}>
        <EmptyState emoji="🛒" title="Your cart is empty" sub="Find what your pet needs, or ask Mylo for help." action={{ label: 'Browse the shop', onClick: () => router.push('/shop') }} />
        <AskBar />
      </PageShell>
    );
  }

  return (
    <PageShell variant="plum" size="large" title="Cart" subtitle={`${cart.length} item${cart.length > 1 ? 's' : ''}`} onBack={() => router.back()}
      footer={
        <>
          {err && <p className="mb-2 text-[13px] font-medium text-danger" role="alert">{err}</p>}
          <PillButton onClick={pay} loading={busy} trailing={inr(total)}>{session ? 'Pay securely' : 'Sign in & pay'}</PillButton>
        </>
      }>
      <section className="space-y-2.5">
        {cart.map((l) => (
          <div key={l.handle}>
            <ProductRow p={l.product}><AddControl p={l.product} /></ProductRow>
            {(l.product.vaccine || !l.product.in_stock) && (
              <p className="mt-1 px-1 text-[12px] font-medium text-danger">
                {l.product.vaccine ? 'Vaccines are arranged by our team on WhatsApp.' : 'Out of stock right now.'}{' '}
                <button type="button" onClick={() => setQty(l.product, 0)} className="underline">Remove</button>
              </p>
            )}
          </div>
        ))}
      </section>

      {ful === 'delivery' && (
        <div className="mt-4 rounded-card bg-plum-soft p-3">
          <p className="text-[13px] font-semibold text-plum">{gap > 0 ? `Add ${inr(gap)} more for free delivery` : 'Free delivery unlocked 🎉'}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-plum transition-all" style={{ width: `${Math.min(100, (subtotal / delivery.free_min) * 100)}%` }} /></div>
          {gap > 0 && <Link href={`/ask?q=${encodeURIComponent(`Suggest something useful for my pet to reach ${inr(delivery.free_min)} for free delivery`)}`} className="mt-2 inline-block text-[12px] font-bold text-plum underline">Ask Mylo for a useful add-on</Link>}
        </div>
      )}

      <section className="mt-7">
        <h2 className="mb-3 text-[17px] font-bold text-ink">How do you want it?</h2>
        {delivery.pickup_enabled ? (
          <Segmented value={ful} onChange={(v) => setFul(v as 'delivery' | 'pickup')}
            options={[{ value: 'delivery', label: '🚚 Home delivery' }, { value: 'pickup', label: '🏪 Pickup (free)' }]} />
        ) : null}
        <p className="mt-2 text-[13px] text-muted">
          {ful === 'delivery'
            ? `Delivered ${nextRun || 'on the next run'}, ${delivery.window}. Pay before ${delivery.cutoff_hour > 12 ? delivery.cutoff_hour - 12 + ' pm' : delivery.cutoff_hour + ' am'} for same-evening runs.`
            : 'Collect from our store: 764/A, 22nd Cross, Parangipalya Main Road, HSR Layout. We’ll WhatsApp you when it’s ready.'}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-[17px] font-bold text-ink">Your details</h2>
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" autoComplete="name" />
        {ful === 'delivery' && (
          <>
            {saved.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {saved.map((s) => (
                  <button key={s.id} type="button" onClick={() => { const pin = s.address_text.match(/\b56\d{4}\b/)?.[0] ?? ''; setAddr({ line1: s.address_text, landmark: '', pincode: pin }); }}
                    className="min-h-[36px] rounded-full border border-line px-3 text-[12px] font-semibold text-body">📍 {s.label}</button>
                ))}
              </div>
            )}
            <Field label="Address" value={addr.line1} onChange={(e) => setAddr((a) => ({ ...a, line1: e.target.value }))} placeholder="House / flat, street, area" autoComplete="street-address" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Landmark" value={addr.landmark} onChange={(e) => setAddr((a) => ({ ...a, landmark: e.target.value }))} placeholder="Optional" />
              <Field label="Pincode" inputMode="numeric" maxLength={6} value={addr.pincode} onChange={(e) => setAddr((a) => ({ ...a, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="5600xx" autoComplete="postal-code" />
            </div>
          </>
        )}
        <p className="text-[12px] text-muted">{session ? `Order updates go to +${session.user.phone}.` : 'You’ll confirm your phone number with a one-time code.'}</p>
      </section>

      {needsRx && (
        <section className="mt-6 rounded-card border-[1.5px] border-dashed border-plum p-4">
          <h2 className="text-[15px] font-bold text-ink">Vet prescription</h2>
          <p className="mt-1 text-[13px] leading-[1.5] text-body">For: {cart.filter((l) => l.product.rx).map((l) => l.product.title).join(', ')}. A clear photo or PDF showing your pet’s name, the medicine and the vet’s signature.</p>
          <label className="mt-3 flex min-h-[48px] cursor-pointer items-center justify-center rounded-full bg-plum-soft px-4 text-[14px] font-bold text-plum">
            {rxFile ? `✓ ${rxFile.name.slice(0, 28)}` : 'Upload photo or PDF'}
            <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { if (f.size > 8 * 1024 * 1024) { setErr('File must be under 8 MB'); return; } setRxFile(f); setRxId(null); setErr(''); } }} />
          </label>
        </section>
      )}

      <section className="mt-7 rounded-card bg-surface-alt p-4 text-[14px]">
        <div className="flex justify-between"><span className="text-muted">Items (MRP)</span><span>{inr(mrpTotal)}</span></div>
        {mrpTotal > subtotal && <div className="flex justify-between text-success"><span>Mylopaws savings</span><span>−{inr(mrpTotal - subtotal)}</span></div>}
        <div className="flex justify-between"><span className="text-muted">{ful === 'pickup' ? 'Store pickup' : 'Delivery'}</span><span>{fee ? inr(fee) : 'Free'}</span></div>
        <div className="mt-2 flex justify-between border-t border-line pt-2 text-[16px] font-bold text-plum"><span>To pay</span><span>{inr(total)}</span></div>
        <p className="mt-2 text-[11px] text-muted">Prices include taxes. Final amount is confirmed on the payment screen. Questions? <a className="underline" href={`https://wa.me/${support}`} target="_blank" rel="noreferrer">WhatsApp us</a>.</p>
      </section>

      <PhoneAuthSheet open={authOpen} title="Sign in to place your order" onClose={() => { setAuthOpen(false); resume.current = false; }} onVerified={() => setAuthOpen(false)} />
    </PageShell>
  );
}
