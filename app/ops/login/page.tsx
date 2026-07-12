'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PillButton, Field } from '@/components/design';

export default function OpsLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const signIn = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setErr(error.message === 'Invalid login credentials' ? 'Invalid credentials. Please try again.' : error.message);
    else router.replace('/ops/board/travel');
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-white">
      <div className="flex flex-col items-center justify-center px-6 pb-8 pt-20 text-center">
        <div className="text-5xl">🐾</div>
        <h1 className="mt-3 text-[28px] font-extrabold tracking-[-0.5px] text-ink">Mylopaws Ops</h1>
        <p className="mt-1 text-[14px] font-semibold text-plum">Seller &amp; Operations Platform</p>
      </div>

      <form className="mt-2 px-5" onSubmit={e => { e.preventDefault(); signIn(); }}>
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@mylopaws.com" />
        <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
        {err && <p className="mb-3 text-[13px] font-medium text-danger">{err}</p>}
        <PillButton type="submit" loading={busy}>Log In</PillButton>
        <p className="mt-4 text-center text-[12px] leading-[1.5] text-muted">Staff &amp; partner access only. Accounts are created by Mylopaws admins.</p>
      </form>
    </main>
  );
}
