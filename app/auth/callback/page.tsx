'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // detectSessionInUrl exchanges the ?code= automatically; listen for the result
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      router.replace(session ? '/' : '/login');
    });

    // In case the exchange already completed before the listener attached
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/');
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return <Spinner label="Signing you in…" />;
}
