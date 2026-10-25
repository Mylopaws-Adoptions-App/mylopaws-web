'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import Header from '@/components/shop/Header';
import { useShop } from '@/components/shop/ShopProvider';
import { useMylo } from '@/components/shop/MyloChat';
import { PetSheet } from '@/components/shop/PetSheet';
import PhoneAuthSheet from '@/components/PhoneAuthSheet';

// "You" tab, Amazon style: greeting, quick tiles, account links.
export default function Account() {
  const { session, pet, support } = useShop();
  const { openMylo } = useMylo();
  const [name, setName] = useState('');
  const [petOpen, setPetOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!session) { setName(''); return; }
    supabase.from('customers').select('name').eq('id', session.user.id).single().then(({ data }) => setName((data?.name ?? '').split(' ')[0]));
  }, [session]);

  const tile = 'flex min-h-[52px] items-center justify-center rounded-full border border-line bg-surface-alt px-3 text-[14px] font-semibold text-ink';
  const rows: { label: string; href?: string; onClick?: () => void; external?: boolean }[] = [
    { label: 'Your Orders', href: '/orders' },
    { label: 'Buy Again', href: '/orders' },
    { label: pet ? `Your pet: ${pet.name}` : 'Add your pet', onClick: () => setPetOpen(true) },
    { label: 'Your addresses & details', href: '/profile' },
    { label: 'Ask Mylo', onClick: () => openMylo() },
    { label: 'Customer service (WhatsApp)', href: `https://wa.me/${support}`, external: true },
    { label: 'Past Travel & Dermacare bookings', href: '/bookings' },
    { label: 'Cancellations & refunds', href: '/cancellation' },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-surface-alt pb-28">
      <Header categories={false} />
      <div className="bg-white px-4 py-4">
        <h1 className="text-[22px] text-ink">Hello, <b>{session ? name || 'pet parent' : 'sign in'}</b></h1>
        {session && <p className="text-[13px] text-muted">+{session.user.phone}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {session ? (
            <>
              <Link href="/orders" className={tile}>Your Orders</Link>
              <Link href="/orders" className={tile}>Buy Again</Link>
              <button type="button" onClick={() => setPetOpen(true)} className={tile}>{pet ? `${pet.species === 'cat' ? '🐱' : '🐶'} ${pet.name}` : 'Add your pet'}</button>
              <Link href="/profile" className={tile}>Your Account</Link>
            </>
          ) : (
            <button type="button" onClick={() => setAuthOpen(true)} className="col-span-2 flex min-h-[50px] items-center justify-center rounded-full bg-butter text-[15px] font-bold text-ink">Sign in with your phone</button>
          )}
        </div>
      </div>

      <section className="mt-3 divide-y divide-line bg-white">
        {rows.map((r) => {
          const cls = 'flex min-h-[54px] w-full items-center justify-between px-4 text-left text-[15px] text-ink';
          if (r.onClick) return <button key={r.label} type="button" onClick={r.onClick} className={cls}>{r.label}<span className="text-muted">›</span></button>;
          if (r.external) return <a key={r.label} href={r.href} target="_blank" rel="noreferrer" className={cls}>{r.label}<span className="text-muted">›</span></a>;
          return <Link key={r.label} href={r.href!} className={cls}>{r.label}<span className="text-muted">›</span></Link>;
        })}
      </section>

      {session && (
        <button type="button" onClick={() => { track('logout'); supabase.auth.signOut().then(() => location.assign('/')); }}
          className="mx-4 mt-4 flex min-h-[48px] w-[calc(100%-2rem)] items-center justify-center rounded-full border border-line bg-white text-[15px] font-semibold text-body">Sign out</button>
      )}
      <p className="mt-6 text-center text-[12px] text-muted"><Link href="/terms" className="underline">Conditions</Link> · <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/ops/login" className="underline">Staff</Link></p>
      <PetSheet open={petOpen} onClose={() => setPetOpen(false)} />
      <PhoneAuthSheet open={authOpen} onClose={() => setAuthOpen(false)} onVerified={() => setAuthOpen(false)} />
    </div>
  );
}
