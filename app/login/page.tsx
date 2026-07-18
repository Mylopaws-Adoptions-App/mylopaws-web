'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { PillButton, Photo, Field, Logo } from '@/components/design';

export default function Login() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  // Test-credentials sign-in (for reviewers who can't use Google OAuth).
  const [showTest, setShowTest] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [testBusy, setTestBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace('/'); });
  }, [router]);

  const signIn = async () => {
    setBusy(true); setErr(null);
    track('login_start', { method: 'google' });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined },
    });
    if (error) { setErr(error.message); setBusy(false); }
  };

  const signInWithPassword = async () => {
    if (!email.trim() || !password) { setErr('Enter both email and password.'); return; }
    setTestBusy(true); setErr(null);
    track('login_start', { method: 'password' });
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setErr(error.message); setTestBusy(false); return; }
    track('login', { method: 'password' });
    router.replace('/');
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-white px-5 pb-4 pt-[calc(4rem+env(safe-area-inset-top))]">
      <Logo boxClassName="h-16 w-44 mb-5" priority />
      <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-ink">Sign In</h1>
      <p className="mt-2 text-[15px] leading-[1.5] text-body">Pet travel &amp; dermacare, made effortless.</p>

      {/* Hero photo absorbs the free vertical space (flex-1) — no more dead gap. */}
      <Photo srcKey="loginHero" alt="A happy family with their pet" priority
        className="mt-6 min-h-[220px] flex-1" overlay="from-black/25 via-transparent to-transparent" />

      <div className="mt-6">
        <PillButton onClick={signIn} loading={busy}>Continue with Google</PillButton>

        {/* Test credentials — subordinate to Google, collapsed by default. */}
        {!showTest ? (
          <button type="button" onClick={() => { setShowTest(true); setErr(null); }}
            className="mx-auto mt-4 block text-[13px] font-semibold text-plum underline decoration-line underline-offset-4">
            Use test credentials
          </button>
        ) : (
          <div className="mt-4 rounded-card border border-line bg-surface-alt p-4">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Test sign-in</p>
            <Field type="email" inputMode="email" autoComplete="email" placeholder="Email"
              value={email} onChange={e => setEmail(e.target.value)} />
            <Field type="password" autoComplete="current-password" placeholder="Password"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') signInWithPassword(); }} />
            <PillButton variant="secondary" onClick={signInWithPassword} loading={testBusy}>Sign in</PillButton>
          </div>
        )}

        {err && <p className="mt-3 text-center text-[13px] font-medium text-danger">{err}</p>}
        <p className="mt-4 text-center text-[12px] leading-[1.5] text-muted">
          By continuing you agree to our{' '}
          <Link href="/terms" className="font-medium text-plum underline underline-offset-2">Terms</Link> and{' '}
          <Link href="/privacy" className="font-medium text-plum underline underline-offset-2">Privacy Policy</Link>.
        </p>
      </div>

      {/* Policy links + discreet staff entry point. */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] font-medium text-muted">
        <Link href="/terms" className="underline decoration-line underline-offset-4">Terms &amp; Conditions</Link>
        <span aria-hidden>·</span>
        <Link href="/privacy" className="underline decoration-line underline-offset-4">Privacy Policy</Link>
        <span aria-hidden>·</span>
        <Link href="/cancellation" className="underline decoration-line underline-offset-4">Cancellation Policy</Link>
      </div>
      <Link href="/ops/login"
        className="mt-3 block text-center text-[12px] font-medium text-muted underline decoration-line underline-offset-4">
        Staff? Admin login
      </Link>
    </main>
  );
}
