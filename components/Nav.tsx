'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const tabs = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/bookings', label: 'Bookings', icon: '📋' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

export default function Nav() {
  const path = usePathname();
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <Link href="/" className="font-display text-2xl font-black text-magenta">Mylopaws 🐾</Link>
          <nav className="hidden gap-6 sm:flex">
            {tabs.map(t => (
              <Link key={t.href} href={t.href}
                className={`text-sm font-bold ${path === t.href ? 'text-magenta' : 'text-ink-soft hover:text-ink'}`}>
                {t.label}
              </Link>
            ))}
            <button onClick={() => supabase.auth.signOut().then(() => location.assign('/login'))}
              className="text-sm font-bold text-ink-soft hover:text-ink">Log out</button>
          </nav>
        </div>
      </header>
      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white sm:hidden">
        {tabs.map(t => (
          <Link key={t.href} href={t.href}
            className={`flex flex-1 flex-col items-center py-2 text-[11px] font-bold ${path === t.href ? 'text-magenta' : 'text-ink-soft'}`}>
            <span className="text-xl">{t.icon}</span>{t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
