'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Btn } from '@/components/ui';

export default function Login() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace('/'); });
  }, [router]);

  const signIn = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined },
    });
    if (error) { setErr(error.message); setBusy(false); }
  };

  return (
    <main className="flex min-h-screen flex-col bg-magenta">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="text-7xl">🐾</div>
        <h1 className="mt-2 font-display text-5xl font-black text-white">Mylopaws</h1>
        <p className="mt-3 max-w-xs text-lg font-semibold leading-snug text-brass">Pet travel & dermacare, made effortless.</p>
      </div>
      <div className="rounded-t-[28px] bg-cream px-6 pb-12 pt-8">
        <div className="mx-auto max-w-sm">
          <Btn onClick={signIn} loading={busy} className="w-full">Continue with Google</Btn>
          {err && <p className="mt-3 text-center text-sm text-red-600">{err}</p>}
          <p className="mt-4 text-center text-xs text-ink-soft">By continuing you agree to our Terms & Privacy Policy at mylopaws.com</p>
        </div>
      </div>
    </main>
  );
}
