'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Staff } from '@/lib/types';
import { Spinner, Btn } from '@/components/ui';
import { OpsCtx } from '@/components/OpsContext';

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Staff | null | 'missing'>(null);
  const [ready, setReady] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const isLogin = path === '/ops/login';

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setMe(null); return; }
    supabase.from('staff').select('*').eq('auth_user_id', session.user.id).eq('active', true).maybeSingle()
      .then(({ data }) => setMe((data as Staff) ?? 'missing'));
  }, [session]);

  useEffect(() => {
    if (ready && !session && !isLogin) router.replace('/ops/login');
    if (ready && session && isLogin) router.replace('/ops/board/travel');
  }, [ready, session, isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (!ready || (session && me === null)) return <Spinner label="Signing you in…" />;
  if (!session) return null;
  if (me === 'missing') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-3 font-display text-2xl font-black">Not registered as staff</h1>
        <p className="mt-2 max-w-sm text-sm text-ink-soft">This account isn't registered as Mylopaws staff, or has been deactivated. Ask an admin to add you.</p>
        <Btn kind="ghost" className="mt-5" onClick={() => supabase.auth.signOut().then(() => location.assign('/ops/login'))}>Log out</Btn>
      </main>
    );
  }
  const staff = me as Staff;
  const isAdmin = staff.role === 'admin';
  const tabs = [
    { href: '/ops/board/travel', label: '🚗 Travel' },
    { href: '/ops/board/dermacare', label: '✨ Dermacare' },
    ...(isAdmin ? [
      { href: '/ops/assistant', label: '🎙 Assistant' },
      { href: '/ops/team', label: '👷 Team' },
      { href: '/ops/composer', label: '📣 Push' },
    ] : []),
  ];
  return (
    <OpsCtx.Provider value={{ session, me: staff }}>
      <header className="sticky top-0 z-40 border-b border-line bg-night text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 overflow-x-auto px-5 py-3">
          <span className="shrink-0 font-display text-lg font-black">Mylopaws Ops</span>
          <nav className="flex gap-4">
            {tabs.map(t => (
              <Link key={t.href} href={t.href}
                className={`whitespace-nowrap text-sm font-bold ${path.startsWith(t.href) ? 'text-brass' : 'text-white/70 hover:text-white'}`}>
                {t.label}
              </Link>
            ))}
          </nav>
          <button onClick={() => supabase.auth.signOut().then(() => location.assign('/ops/login'))}
            className="ml-auto shrink-0 text-sm font-bold text-white/70 hover:text-white">Log out</button>
        </div>
      </header>
      {children}
    </OpsCtx.Provider>
  );
}
