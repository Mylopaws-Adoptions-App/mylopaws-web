'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, ListIcon, UserIcon, CartIcon } from '@/components/design/nav-icons';
import { useShop } from '@/components/shop/ShopProvider';

// Bottom tab bar, Amazon-app style: Home · Categories · You · Cart (with count). Mylo lives in the search bar.
// Mounted ONCE in app/layout.tsx, outside the animated `.mp-page` template, so `position: fixed`
// always resolves against the viewport. Travel/Dermacare pages still exist but are off the nav.
const tabs = [
  { href: '/', label: 'Home', Icon: HomeIcon, exact: true, match: ['/s', '/p/'] },
  { href: '/categories', label: 'Categories', Icon: ListIcon },
  { href: '/account', label: 'You', Icon: UserIcon, match: ['/orders', '/profile'] },
  { href: '/cart', label: 'Cart', Icon: CartIcon, match: ['/checkout'] },
];

const HIDE_TABBAR = ['/login', '/auth', '/ops', '/terms', '/privacy', '/cancellation'];
export function showTabBar(path: string | null): boolean {
  if (!path) return false;
  return !HIDE_TABBAR.some((p) => path === p || path.startsWith(p + '/'));
}

export default function TabBar() {
  const path = usePathname();
  const { count } = useShop();
  if (!path || !showTabBar(path)) return null;
  const on = (href: string, exact?: boolean, match?: string[]) =>
    (exact ? path === href : path === href || path.startsWith(href + '/')) || (match ?? []).some((m) => path === m || path.startsWith(m.endsWith('/') ? m : m + '/'));
  return (
    <nav aria-label="Main" className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {tabs.map(({ href, label, Icon, exact, match }) => {
          const active = on(href, exact, match);
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold ${active ? 'text-plum' : 'text-muted'}`}>
              {active && <span className="absolute top-0 h-[3px] w-10 rounded-b-full bg-plum" />}
              <span className="relative">
                <Icon className="h-[22px] w-[22px]" />
                {href === '/cart' && count > 0 && <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-butter px-1 text-[11px] font-bold text-ink">{count > 99 ? '99+' : count}</span>}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
