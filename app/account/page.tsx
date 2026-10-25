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
import { ChevronRight, Package, Repeat, PawPrint, MapPin, Sparkles, MessageCircle, History, Undo2, type LucideIcon } from 'lucide-react';

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

  const tile = 'flex min-h-[52px] items-center justify-center rounded-2xl border border-[#EEE7EB] bg-[#FAF8F9] px-3 text-[14px] font-semibold text-ink';
  const rows: { label: string; Icon: LucideIcon; href?: string; onClick?: () => void; external?: boolean }[] = [
    { label: 'Your Orders', Icon: Package, href: '/orders' },
    { label: 'Buy Again', Icon: Repeat, href: '/orders' },
    { Icon: PawPrint, label: pet ? `Your pet: ${pet.name}` : 'Add your pet', onClick: () => setPetOpen(true) },
    { Icon: MapPin, label: 'Your addresses & details', href: '/profile' },
    { Icon: Sparkles, label: 'Ask Mylo', onClick: () => openMylo() },
    { Icon: MessageCircle, label: 'Customer service (WhatsApp)', href: `https://wa.me/${support}`, external: true },
    { Icon: History, label: 'Past Travel & Dermacare bookings', href: '/bookings' },
    { Icon: Undo2, label: 'Cancellations & refunds', href: '/cancellation' },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#FAF8F9] pb-28">
      <Header />
      <div className="mx-4 mt-4 rounded-2xl border border-[#EEE7EB] bg-white p-4">
        <h1 className="text-[22px] text-ink">Hello, <b>{session ? name || 'pet parent' : 'sign in'}</b></h1>
        {session && <p className="text-[13px] text-muted">+{session.user.phone}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {session ? (
            <>
              <Link href="/orders" className={tile}>Your Orders</Link>
              <Link href="/orders" className={tile}>Buy Again</Link>
              <button type="button" onClick={() => setPetOpen(true)} className={tile}>{pet ? pet.name : 'Add your pet'}</button>
              <Link href="/profile" className={tile}>Your Account</Link>
            </>
          ) : (
            <button type="button" onClick={() => setAuthOpen(true)} className="col-span-2 flex min-h-[50px] items-center justify-center rounded-full bg-plum text-[15px] font-semibold text-white">Sign in with your phone</button>
          )}
        </div>
      </div>

      <section className="mx-4 mt-4 divide-y divide-[#F3EEF1] overflow-hidden rounded-2xl border border-[#EEE7EB] bg-white">
        {rows.map((r) => {
          const cls = 'flex min-h-[54px] w-full items-center gap-3 px-4 text-left text-[14.5px] text-ink active:bg-[#F7F4F6]';
          const inner = <><r.Icon className="h-[18px] w-[18px] text-plum" /><span className="flex-1">{r.label}</span><ChevronRight className="h-4 w-4 text-muted" /></>;
          if (r.onClick) return <button key={r.label} type="button" onClick={r.onClick} className={cls}>{inner}</button>;
          if (r.external) return <a key={r.label} href={r.href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>;
          return <Link key={r.label} href={r.href!} className={cls}>{inner}</Link>;
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
