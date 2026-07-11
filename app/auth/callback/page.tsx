'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Wait specifically for SIGNED_IN — onAuthStateChange fires INITIAL_SESSION
    // immediately (null) before PKCE exchange completes, so we must not redirect on null.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) router.replace('/');
      if (event === 'SIGNED_OUT') router.replace('/login');
    });

    // In case the exchange already completed before the listener attached
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/');
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return <Spinner label="Signing you in…" />;
}
