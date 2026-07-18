'use client';
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Staff } from '@/lib/types';
import { LoadingState, PillButton } from '@/components/design';
import { OpsCtx } from '@/components/OpsContext';
import OpsTabBar from '@/components/ops/OpsTabBar';

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
  if (!ready || (session && me === null)) return <div className="mx-auto flex min-h-screen max-w-[480px] items-center justify-center bg-white"><LoadingState label="Signing you in…" /></div>;
  if (!session) return null;
  if (me === 'missing') {
    return (
      <main className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center bg-white px-6 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-3 text-[22px] font-bold text-ink">Not registered as staff</h1>
        <p className="mt-2 max-w-sm text-[14px] leading-[1.5] text-muted">This account isn&apos;t registered as Mylopaws staff, or has been deactivated. Ask an admin to add you.</p>
        <div className="mt-6 w-full max-w-[240px]">
          <PillButton variant="secondary" onClick={() => supabase.auth.signOut().then(() => location.assign('/ops/login'))}>Log out</PillButton>
        </div>
      </main>
    );
  }
  const staff = me as Staff;
  const isAdmin = staff.role === 'admin';

  // GAP 5 — hard route guard: a non-admin (supplier) hitting an admin-only route by URL is bounced,
  // not just visually hidden. (Data is separately protected by RLS.)
  const ADMIN_ONLY = ['/ops/team', '/ops/composer', '/ops/assistant', '/ops/homes'];
  if (!isAdmin && ADMIN_ONLY.some(p => path === p || path.startsWith(p + '/'))) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center bg-white px-6 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-3 text-[22px] font-bold text-ink">Admins only</h1>
        <p className="mt-2 max-w-sm text-[14px] leading-[1.5] text-muted">This area is restricted to Mylopaws admins.</p>
        <div className="mt-6 w-full max-w-[240px]">
          <PillButton onClick={() => router.replace('/ops/board/dermacare')}>Back to my jobs</PillButton>
        </div>
      </main>
    );
  }

  // Section navigation now lives in the persistent bottom bar (OpsTabBar). The top header is a slim
  // brand bar that keeps Log out reachable on every screen (suppliers have no "More" menu).
  return (
    <OpsCtx.Provider value={{ session, me: staff }}>
      <header className="sticky top-0 z-30 bg-plum text-white">
        <div className="mx-auto flex max-w-2xl items-center px-5 py-3">
          <span className="text-[17px] font-bold">Mylopaws Ops</span>
          <button onClick={() => supabase.auth.signOut().then(() => location.assign('/ops/login'))}
            className="ml-auto text-[14px] font-semibold text-white/70 hover:text-white">Log out</button>
        </div>
      </header>
      {/* Bottom-nav clearance for every ops screen; screens with their own fixed action bars lift
          those above the nav using OPS_NAV_OFFSET. */}
      <div className="pb-[calc(56px+env(safe-area-inset-bottom))]">{children}</div>
      <OpsTabBar isAdmin={isAdmin} />
    </OpsCtx.Provider>
  );
}
