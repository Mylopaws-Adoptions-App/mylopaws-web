'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, CarIcon, SparkleIcon, ListIcon, UserIcon } from '@/components/design/nav-icons';

// Bottom tab bar (SKILL section 5): 5 tabs, white bg, hairline top border, ~64px.
// Icon above 11px label. Active = plum, inactive = muted. Constrained to the 480px phone
// shell and centered so it lines up with PageShell.
//
// CHANGE 4: this is mounted ONCE in app/layout.tsx, OUTSIDE the animated `.mp-page` route
// template. Rendering a `position: fixed` element inside a transformed/animated ancestor makes
// it resolve against that ancestor (containing-block trap) instead of the viewport, which is why
// the bar could scroll away on some pages (e.g. Homes detail). Mounting it at the layout root
// guarantees it is always fixed to the viewport, on every customer screen, regardless of scroll.
const tabs = [
  { href: '/', label: 'Home', Icon: HomeIcon, exact: true },
  { href: '/travel', label: 'Travel', Icon: CarIcon },
  { href: '/dermacare', label: 'Dermacare', Icon: SparkleIcon },
  { href: '/bookings', label: 'Bookings', Icon: ListIcon },
  { href: '/profile', label: 'Profile', Icon: UserIcon },
];

// Persistent bottom nav on EVERY customer route (Stage 6) — including deep booking steps
// (/travel, /dermacare/book) and /track. Booking flows keep their own fixed CTA, which PageShell
// stacks directly ABOVE this bar. We hide the bar only on non-customer surfaces: auth/login, the
// ops app, and the standalone legal pages. Exported so PageShell reserves space + offsets its CTA
// consistently (single source of truth for when the bar is present).
const HIDE_TABBAR = ['/login', '/auth', '/ops', '/terms', '/privacy', '/cancellation'];
export function showTabBar(path: string | null): boolean {
  if (!path) return false;
  return !HIDE_TABBAR.some((p) => path === p || path.startsWith(p + '/'));
}

export default function TabBar() {
  const path = usePathname();
  if (!path || !showTabBar(path)) return null;
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {tabs.map(({ href, label, Icon, exact }) => {
          const active = exact ? path === href : path === href || path.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold ${
                active ? 'text-plum' : 'text-muted'
              }`}
            >
              <Icon className="h-[22px] w-[22px]" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
