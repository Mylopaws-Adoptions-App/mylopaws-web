'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Spinner } from './ui';

const Ctx = createContext<{ session: Session | null }>({ session: null });
export const useSession = () => useContext(Ctx);

export default function AuthGate({ children, redirect = '/login' }: { children: React.ReactNode; redirect?: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (ready && !session) router.replace(redirect);
    if (ready && session) {
      supabase.from('customers').upsert({
        id: session.user.id,
        name: (session.user.user_metadata?.full_name ?? session.user.user_metadata?.name) || null,
        email: session.user.email ?? null,
      }, { onConflict: 'id' }).then(() => {});
    }
  }, [ready, session, redirect, router]);

  if (!ready) return <Spinner label="Waking up Mylopaws…" />;
  if (!session) return null;
  return <Ctx.Provider value={{ session }}>{children}</Ctx.Provider>;
}
