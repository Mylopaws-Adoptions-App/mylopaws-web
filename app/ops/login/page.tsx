'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Btn, Field } from '@/components/ui';

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
    <main className="flex min-h-screen flex-col bg-night">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl">🐾</div>
        <h1 className="mt-2 font-display text-4xl font-black text-white">Mylopaws Ops</h1>
        <p className="mt-2 font-semibold text-brass">Seller & Operations Platform</p>
      </div>
      <div className="rounded-t-[28px] bg-cream px-6 pb-12 pt-8">
        <form className="mx-auto max-w-sm" onSubmit={e => { e.preventDefault(); signIn(); }}>
          <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@mylopaws.com" />
          <Field label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
          <Btn type="submit" kind="secondary" loading={busy} className="w-full">Log In</Btn>
          <p className="mt-4 text-center text-xs text-ink-soft">Staff & partner access only. Accounts are created by Mylopaws admins.</p>
        </form>
      </div>
    </main>
  );
}
