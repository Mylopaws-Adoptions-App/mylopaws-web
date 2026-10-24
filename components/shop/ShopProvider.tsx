'use client';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { CartItem, DeliveryConfig, MAX_QTY, Product, ShopPet, readLS, shopFn, writeLS } from '@/lib/shop';

type Ctx = {
  session: Session | null;
  authReady: boolean;
  cart: CartItem[];
  count: number;
  subtotal: number;
  qtyOf: (handle: string) => number;
  setQty: (p: Product, qty: number) => void;
  add: (p: Product, by?: number) => void;
  clear: () => void;
  pet: ShopPet | null;
  setPet: (p: ShopPet | null) => void;
  delivery: DeliveryConfig;
  nextRun: string;
  support: string;
};

const DEFAULT_DELIVERY: DeliveryConfig = { fee: 100, free_min: 2000, window: '5 to 8 pm', run_days: [1, 2, 3, 4, 5, 6], cutoff_hour: 13, pickup_enabled: true };
const C = createContext<Ctx | null>(null);
export const useShop = () => {
  const v = useContext(C);
  if (!v) throw new Error('useShop outside ShopProvider');
  return v;
};

export default function ShopProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pet, setPetState] = useState<ShopPet | null>(null);
  const [delivery, setDelivery] = useState<DeliveryConfig>(DEFAULT_DELIVERY);
  const [nextRun, setNextRun] = useState('');
  const [support, setSupport] = useState('919071091699');

  // Restore per-browser state after mount (keeps SSR markup stable).
  useEffect(() => {
    setCart(readLS<CartItem[]>('mp_cart', []).filter((l) => l?.product?.handle && l.qty > 0));
    setPetState(readLS<ShopPet | null>('mp_pet', null));
    shopFn('config').then((c) => {
      setDelivery({ ...DEFAULT_DELIVERY, ...c.delivery });
      setNextRun(c.next_run_label ?? '');
      if (c.support_whatsapp) setSupport(c.support_whatsapp);
    }).catch(() => {});
  }, []);

  // Auth is optional for shopping; it is only needed at checkout and for orders.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Signed in: keep the customer row in step (phone is the identity) and pick up a saved pet.
  useEffect(() => {
    if (!session) return;
    const phone = session.user.phone ? `+${session.user.phone}` : null;
    supabase.from('customers').upsert({ id: session.user.id, ...(phone ? { phone_number: phone } : {}) }, { onConflict: 'id' }).then(() => {});
    if (!readLS<ShopPet | null>('mp_pet', null)) {
      supabase.from('pets').select('id, name, species, weight_kg, age_years, breed').eq('customer_id', session.user.id)
        .order('created_at', { ascending: false }).limit(1).then(({ data }) => {
          const p = data?.[0];
          if (p) { const sp: ShopPet = { id: p.id, name: p.name, species: p.species === 'cat' ? 'cat' : 'dog', weight_kg: p.weight_kg, age_years: p.age_years, breed: p.breed }; setPetState(sp); writeLS('mp_pet', sp); }
        });
    }
  }, [session]);

  const save = (next: CartItem[]) => { setCart(next); writeLS('mp_cart', next); };

  const setQty = useCallback((p: Product, qty: number) => {
    setCart((prev) => {
      const q = Math.max(0, Math.min(MAX_QTY, Math.floor(qty)));
      const rest = prev.filter((l) => l.handle !== p.handle);
      const existing = prev.find((l) => l.handle === p.handle);
      const next = q > 0 ? (existing ? prev.map((l) => (l.handle === p.handle ? { ...l, qty: q, product: p } : l)) : [...prev, { handle: p.handle, qty: q, product: p }]) : rest;
      writeLS('mp_cart', next);
      if (!existing && q > 0) track('add_to_cart', { item: p.handle, value: p.price });
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(() => ({
    session, authReady, cart,
    count: cart.reduce((t, l) => t + l.qty, 0),
    subtotal: cart.reduce((t, l) => t + l.qty * l.product.price, 0),
    qtyOf: (h) => cart.find((l) => l.handle === h)?.qty ?? 0,
    setQty,
    add: (p, by = 1) => setQty(p, (cart.find((l) => l.handle === p.handle)?.qty ?? 0) + by),
    clear: () => save([]),
    pet,
    setPet: (p) => { setPetState(p); writeLS('mp_pet', p); },
    delivery, nextRun, support,
  }), [session, authReady, cart, setQty, pet, delivery, nextRun, support]);

  return <C.Provider value={value}>{children}</C.Provider>;
}
