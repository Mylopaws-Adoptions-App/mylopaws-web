'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, CarIcon, SparkleIcon, ListIcon, UserIcon } from '@/components/design/nav-icons';

// Bottom tab bar (SKILL section 5): 5 tabs, white bg, hairline top border, ~64px.
// Icon above 11px label. Active = plum, inactive = muted. Constrained to the
// 480px phone shell and centered so it lines up with PageShell.
const tabs = [
  { href: '/', label: 'Home', Icon: HomeIcon, exact: true },
  { href: '/travel', label: 'Travel', Icon: CarIcon },
  { href: '/dermacare', label: 'Dermacare', Icon: SparkleIcon },
  { href: '/bookings', label: 'Bookings', Icon: ListIcon },
  { href: '/profile', label: 'Profile', Icon: UserIcon },
];

export default function Nav() {
  const path = usePathname();
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
