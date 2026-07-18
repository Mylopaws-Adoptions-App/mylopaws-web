'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { LoadingState } from '@/components/design';

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
      if (session) {
        // Only the fresh sign-in event is a real login — ignore token refreshes.
        if (_e === 'SIGNED_IN') track('login', { method: 'google' });
        finish('/');
      }
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) finish('/'); });

    // If the exchange fails or no session materialises, fall back to login.
    const t = setTimeout(() => finish('/login'), 5000);

    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, [router]);

  return <div className="mx-auto flex min-h-screen max-w-[480px] items-center justify-center bg-white"><LoadingState label="Signing you in…" /></div>;
}
