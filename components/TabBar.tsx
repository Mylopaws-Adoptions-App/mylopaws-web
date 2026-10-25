'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { Home, LayoutGrid, ShoppingBag, Sparkles, UserRound } from 'lucide-react';
import { useShop } from '@/components/shop/ShopProvider';
import { useMylo } from '@/components/shop/MyloChat';

// Bottom tab bar: Home · Categories · [Mylo] · You · Cart. Sliding pill marks the active tab
// (Watermelon "continuous tabs" pattern). Mounted once in app/layout.tsx so `fixed` is viewport-relative.
const tabs = [
  { href: '/', label: 'Home', Icon: Home, exact: true, match: ['/s'] },
  { href: '/categories', label: 'Categories', Icon: LayoutGrid },
  { href: '/account', label: 'You', Icon: UserRound, match: ['/orders', '/profile'] },
  { href: '/cart', label: 'Cart', Icon: ShoppingBag },
];

// Product pages and checkout carry their own sticky buy bar instead.
const HIDE_TABBAR = ['/login', '/auth', '/ops', '/terms', '/privacy', '/cancellation', '/p', '/checkout', '/ask'];
export function showTabBar(path: string | null): boolean {
  if (!path) return false;
  return !HIDE_TABBAR.some((p) => path === p || path.startsWith(p + '/'));
}

export default function TabBar() {
  const path = usePathname();
  const { count } = useShop();
  const { openMylo } = useMylo();
  if (!path || !showTabBar(path)) return null;
  const on = (href: string, exact?: boolean, match?: string[]) =>
    (exact ? path === href : path === href || path.startsWith(href + '/')) || (match ?? []).some((m) => path === m || path.startsWith(m + '/'));

  const tab = ({ href, label, Icon, exact, match }: (typeof tabs)[number]) => {
    const active = on(href, exact, match);
    return (
      <Link key={href} href={href} aria-current={active ? 'page' : undefined}
        className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold ${active ? 'text-plum' : 'text-[#8C8490]'}`}>
        <span className="relative flex h-8 w-14 items-center justify-center">
          {active && <motion.span layoutId="tab-pill" transition={{ type: 'spring', stiffness: 380, damping: 30 }} className="absolute inset-0 rounded-full bg-plum-soft" />}
          <Icon className="relative h-[21px] w-[21px]" strokeWidth={active ? 2.3 : 1.9} />
          {href === '/cart' && count > 0 && (
            <motion.span key={count} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="absolute right-1 top-0 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-plum px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {count > 99 ? '99+' : count}
            </motion.span>
          )}
        </span>
        {label}
      </Link>
    );
  };

  return (
    <nav aria-label="Main" className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-[#EEE7EB] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="flex h-[60px] items-stretch">
        {tabs.slice(0, 2).map(tab)}
        <button type="button" onClick={() => openMylo()} aria-label="Ask Mylo" className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold text-plum">
          <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-plum to-[#8A2A60] text-butter shadow-[0_6px_16px_rgba(107,26,71,0.35)] ring-4 ring-white">
            <Sparkles className="h-[22px] w-[22px]" />
          </span>
          Mylo
        </button>
        {tabs.slice(2).map(tab)}
      </div>
    </nav>
  );
}
