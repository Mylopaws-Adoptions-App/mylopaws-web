'use client';
// Mylopaws Shop: client helpers for the shop-app edge function, the cart, the shopper's pet and Razorpay.
import { supabase, fnUrl } from './supabase';

export type Product = {
  id: string; handle: string; title: string; category: string; image_url: string | null;
  price: number; mrp: number; save_pct: number; in_stock: boolean; rx: boolean; vaccine: boolean;
  description?: string | null;
};
export type CartItem = { handle: string; qty: number; product: Product };
export type ShopPet = { id?: string; name: string; species: 'dog' | 'cat'; weight_kg?: number | null; age_years?: number | null; breed?: string | null };
export type DeliveryConfig = { fee: number; free_min: number; window: string; run_days: number[]; cutoff_hour: number; pickup_enabled: boolean };

export const inr = (n: number) => '₹' + Math.round(Number(n)).toLocaleString('en-IN');
export const MAX_QTY = 20;

// Columns read straight from shop_products (public-read RLS).
export const PRODUCT_COLS = 'id, handle, title, category, description, price, mylopaws_price, image_url, in_stock, available, rx_required';

/** shop_products row → Product (selling price = mylopaws_price, falling back to MRP). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toProduct(p: any): Product {
  const price = Number(p.mylopaws_price ?? p.price);
  const mrp = Number(p.price);
  return {
    id: p.id, handle: p.handle, title: p.title, category: p.category, image_url: p.image_url ?? null,
    price, mrp, save_pct: mrp > price ? Math.round((1 - price / mrp) * 100) : 0,
    in_stock: p.available !== false && p.in_stock !== false, rx: !!p.rx_required, vaccine: p.category === 'Vaccines',
    description: p.description ?? null,
  };
}

export const CATEGORIES: { name: string; emoji: string; blurb: string }[] = [
  { name: 'Antiparasitic', emoji: '🪲', blurb: 'Tick & flea protection' },
  { name: 'Skin & Coat Care', emoji: '✨', blurb: 'Itch relief, healthy coat' },
  { name: 'Shampoos & Conditioners', emoji: '🫧', blurb: 'Medicated & gentle washes' },
  { name: 'Supplements & Vitamins', emoji: '💪', blurb: 'Joints, gut, immunity' },
  { name: 'Pet Food', emoji: '🍖', blurb: 'Everyday & therapeutic diets' },
  { name: 'Prescription Medicines', emoji: '💊', blurb: 'With your vet’s prescription' },
  { name: 'Ear Care', emoji: '👂', blurb: 'Cleaners & drops' },
  { name: 'Eye Care', emoji: '👁️', blurb: 'Gentle eye care' },
  { name: 'Wound & Pain Relief', emoji: '🩹', blurb: 'Sprays, gels, first aid' },
  { name: 'Cologne & Paw Care', emoji: '🐾', blurb: 'Paw balm & fresheners' },
  { name: 'Dental Care', emoji: '🦷', blurb: 'Fresh breath, clean teeth' },
];
export const categoryEmoji = (c: string) => CATEGORIES.find((x) => x.name === c)?.emoji ?? '🐾';

/** "What's going on?" problem starters. Each opens Ask Mylo with the prompt. */
export const PROBLEMS = [
  { emoji: '😣', label: 'Itching & scratching', prompt: 'My pet keeps itching and scratching. What can help?' },
  { emoji: '🪲', label: 'Ticks & fleas', prompt: 'I need tick and flea protection for my pet.' },
  { emoji: '🍂', label: 'Shedding, dull coat', prompt: 'My pet is shedding a lot and the coat looks dull.' },
  { emoji: '👂', label: 'Smelly ears', prompt: "My pet's ears smell and he keeps shaking his head." },
  { emoji: '🦴', label: 'Joint care', prompt: 'My dog is getting older. What helps with joints and mobility?' },
  { emoji: '🐶', label: 'New puppy kit', prompt: 'I just got a new puppy. What basics do I need?' },
  { emoji: '🛁', label: 'Bath-time picks', prompt: 'Suggest a good gentle shampoo for regular baths.' },
  { emoji: '🍽️', label: 'Tummy trouble', prompt: 'My pet has an upset tummy now and then. Anything for gut health?' },
];

// ── session id for the agent (stable per browser) ───────────────────
export function chatSid(): string {
  try {
    let s = localStorage.getItem('mp_chat_sid');
    if (!s) { s = crypto.randomUUID(); localStorage.setItem('mp_chat_sid', s); }
    return s;
  } catch { return crypto.randomUUID(); }
}

// ── edge function ─────────────────────────────────────────────────
export class ShopError extends Error { code?: string; extra?: Record<string, unknown>; constructor(m: string, code?: string, extra?: Record<string, unknown>) { super(m); this.code = code; this.extra = extra; } }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function shopFn<T = any>(action: string, body: object = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(fnUrl('shop-app'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ action, ...body }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ShopError(json.error ?? 'Something went wrong. Please try again.', json.code, json);
  return json as T;
}

// ── local storage helpers (per-viewer conveniences; never the source of truth for money) ──
export function readLS<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
export function writeLS(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } }

// ── Razorpay ──────────────────────────────────────────────────────
function loadCheckout(): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the payment gateway'));
    document.body.appendChild(s);
  });
}

/** Opens Razorpay for a shop order created by shop-app `checkout`. Resolves 'paid' only after server verification. */
export async function payShopOrder(o: { key_id: string; razorpay_order_id: string; amount_paise: number; order_number: number; prefill: { name?: string; contact?: string } }): Promise<'paid' | 'dismissed' | 'unverified'> {
  await loadCheckout();
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: 'paid' | 'dismissed' | 'unverified') => { if (!done) { done = true; resolve(v); } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = new (window as any).Razorpay({
      key: o.key_id, order_id: o.razorpay_order_id, amount: o.amount_paise, currency: 'INR',
      name: 'Mylopaws', description: `Shop order #${o.order_number}`,
      prefill: o.prefill, theme: { color: '#6B1A47' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler: async (resp: any) => {
        try {
          await shopFn('verify', { razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature });
          finish('paid');
        } catch { finish('unverified'); }
      },
      modal: { ondismiss: () => finish('dismissed') },
    });
    r.open();
  });
}

/** Shrinks a photo to ≤1600px JPEG before upload; PDFs pass through. Returns base64 (no prefix) + mime. */
export async function fileToUpload(file: File): Promise<{ b64: string; mime: string }> {
  const toB64 = (blob: Blob) => new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(',')[1] ?? '');
    fr.onerror = () => rej(new Error('Could not read the file'));
    fr.readAsDataURL(blob);
  });
  if (file.type === 'application/pdf') return { b64: await toB64(file), mime: 'application/pdf' };
  if (!file.type.startsWith('image/')) throw new Error('Please choose a photo or PDF');
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.85));
    if (blob) return { b64: await toB64(blob), mime: 'image/jpeg' };
  } catch { /* e.g. HEIC not decodable: send as-is */ }
  return { b64: await toB64(file), mime: file.type };
}
