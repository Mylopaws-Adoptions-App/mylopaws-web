'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) console.error('Auth exchange error:', error.message);
        router.replace(data.session ? '/' : '/login');
      });
    } else {
      supabase.auth.getSession().then(({ data }) => {
        router.replace(data.session ? '/' : '/login');
      });
    }
  }, [router]);

  return <Spinner label="Signing you in…" />;
}
