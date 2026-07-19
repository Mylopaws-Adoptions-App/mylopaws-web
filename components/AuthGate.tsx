'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { LoadingState } from './design';

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
      // Phone+OTP is the identity. Upsert ONLY the columns we know from auth (id + phone) so we never
      // clobber a name/email the user later sets in their profile. session.user.phone is E.164 without
      // the leading '+', so re-add it to match the profile's stored format.
      const phone = session.user.phone ? `+${session.user.phone}` : null;
      supabase.from('customers').upsert({
        id: session.user.id,
        ...(phone ? { phone_number: phone } : {}),
      }, { onConflict: 'id' }).then(() => {});
    }
  }, [ready, session, redirect, router]);

  if (!ready) return <div className="mx-auto flex min-h-screen max-w-[480px] items-center justify-center bg-white"><LoadingState label="Waking up Mylopaws…" /></div>;
  if (!session) return null;
  return <Ctx.Provider value={{ session }}>{children}</Ctx.Provider>;
}
