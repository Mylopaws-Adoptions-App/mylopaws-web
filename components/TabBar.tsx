'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, BagIcon, BoxIcon, UserIcon, PawIcon } from '@/components/design/nav-icons';

// Bottom tab bar for the Mylopaws Shop app: Home · Shop · Ask Mylo (raised centre) · Orders · Profile.
// Mounted ONCE in app/layout.tsx, outside the animated `.mp-page` template, so `position: fixed`
// always resolves against the viewport. Travel/Dermacare pages still exist but are off the nav.
const tabs = [
  { href: '/', label: 'Home', Icon: HomeIcon, exact: true },
  { href: '/shop', label: 'Shop', Icon: BagIcon, match: ['/shop', '/p/'] },
  { href: '/ask', label: 'Ask Mylo', Icon: PawIcon, centre: true },
  { href: '/orders', label: 'Orders', Icon: BoxIcon },
  { href: '/profile', label: 'Profile', Icon: UserIcon },
];

const HIDE_TABBAR = ['/login', '/auth', '/ops', '/terms', '/privacy', '/cancellation'];
export function showTabBar(path: string | null): boolean {
  if (!path) return false;
  return !HIDE_TABBAR.some((p) => path === p || path.startsWith(p + '/'));
}

export default function TabBar() {
  const path = usePathname();
  if (!path || !showTabBar(path)) return null;
  return (
    <nav aria-label="Main" className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {tabs.map(({ href, label, Icon, exact, centre, match }) => {
          const active = exact ? path === href : (match ?? [href]).some((m) => path === m || path.startsWith(m.endsWith('/') ? m : m + '/'));
          if (centre) {
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined}
                className="flex min-h-[56px] flex-1 flex-col items-center justify-end gap-1 pb-2 text-[11px] font-semibold text-plum">
                <span className={`-mt-5 flex h-12 w-12 items-center justify-center rounded-full shadow-floating ring-4 ring-white ${active ? 'bg-plum-dark' : 'bg-plum'} text-white`}>
                  <Icon className="h-[24px] w-[24px]" />
                </span>
                {label}
              </Link>
            );
          }
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined}
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold ${active ? 'text-plum' : 'text-muted'}`}>
              <Icon className="h-[22px] w-[22px]" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
