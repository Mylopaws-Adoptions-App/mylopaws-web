'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    let done = false;
    const finish = (path: string) => { if (!done) { done = true; router.replace(path); } };

    // detectSessionInUrl handles both implicit (#access_token) and PKCE (?code=)
    // flows automatically. We just wait for the resulting session — do NOT call
    // signOut() or exchangeCodeForSession() here (that would wipe the PKCE verifier
    // or double-exchange the code).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) finish('/');
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) finish('/'); });

    // If the exchange fails or no session materialises, fall back to login.
    const t = setTimeout(() => finish('/login'), 5000);

    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, [router]);

  return <Spinner label="Signing you in…" />;
}
