'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PillButton } from '@/components/design';

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
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-white px-5 pt-16">
      <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-ink">Sign In</h1>
      <p className="mt-2 text-[15px] leading-[1.5] text-body">Pet travel &amp; dermacare, made effortless.</p>

      <div className="mt-8">
        <PillButton onClick={signIn} loading={busy}>Continue with Google</PillButton>
        {err && <p className="mt-3 text-center text-[13px] font-medium text-danger">{err}</p>}
        <p className="mt-4 text-center text-[12px] leading-[1.5] text-muted">By continuing you agree to our Terms &amp; Privacy Policy at mylopaws.com</p>
      </div>

      <div className="mt-auto flex items-end justify-center pb-4 text-[84px] leading-none" aria-hidden>🐕🐈</div>

      {/* Discreet staff entry point — subordinate to the primary Google CTA. */}
      <Link href="/ops/login"
        className="mb-4 block text-center text-[12px] font-medium text-muted underline decoration-line underline-offset-4">
        Staff? Admin login
      </Link>
    </main>
  );
}
