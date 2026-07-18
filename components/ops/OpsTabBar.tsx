'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { CarIcon, SparkleIcon, CatIcon, MoreIcon, MicIcon, TeamIcon, MegaphoneIcon } from '@/components/design/nav-icons';
import { Sheet } from '@/components/design';

/**
 * Ops bottom navigation — the ops counterpart of the customer TabBar. Replaces the old
 * horizontally-scrolling top tab strip. Groomers work standing at a customer's door on a phone,
 * so the section switch lives at the thumb, persistent on every ops screen (ops-design skill IA).
 *
 * Bottom-nav best practice is ≤5 items. Suppliers only have 2 sections (Travel, Dermacare).
 * Admins have 6 — so the bar shows the 4 primary destinations (Travel · Dermacare · Homes · More)
 * and tucks the 3 admin tools (Assistant, Team, Push) behind a "More" sheet. Per-screen action
 * bars (bulk-assign, Call/Navigate) stack directly ABOVE this bar; content is padded in the layout.
 *
 * Height is 56px + safe-area — kept in sync with OPS_NAV_OFFSET below, which screens use to lift
 * their fixed action bars above this one.
 */
export const OPS_NAV_OFFSET = 'calc(56px + env(safe-area-inset-bottom))';

type Item = { href: string; label: string; Icon: (p: any) => JSX.Element };

const PRIMARY_SUPPLIER: Item[] = [
  { href: '/ops/board/travel', label: 'Travel', Icon: CarIcon },
  { href: '/ops/board/dermacare', label: 'Dermacare', Icon: SparkleIcon },
];

const MORE_ITEMS: Item[] = [
  { href: '/ops/assistant', label: 'Assistant', Icon: MicIcon },
  { href: '/ops/team', label: 'Team', Icon: TeamIcon },
  { href: '/ops/composer', label: 'Push', Icon: MegaphoneIcon },
];

export default function OpsTabBar({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => path === href || path.startsWith(href + '/');
  const moreActive = MORE_ITEMS.some((i) => isActive(i.href));

  const primary: Item[] = isAdmin
    ? [...PRIMARY_SUPPLIER, { href: '/ops/homes', label: 'Homes', Icon: CatIcon }]
    : PRIMARY_SUPPLIER;

  const cell = 'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold';

  return (
    <>
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-2xl -translate-x-1/2 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {primary.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} className={`${cell} ${active ? 'text-plum' : 'text-muted'}`}>
                <Icon className="h-[22px] w-[22px]" />
                {label}
              </Link>
            );
          })}
          {isAdmin && (
            <button type="button" onClick={() => setMoreOpen(true)}
              className={`${cell} ${moreActive ? 'text-plum' : 'text-muted'}`} aria-label="More sections">
              <MoreIcon className="h-[22px] w-[22px]" />
              More
            </button>
          )}
        </div>
      </nav>

      {isAdmin && (
        <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
          <div className="space-y-1 pb-1">
            {MORE_ITEMS.map(({ href, label, Icon }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 rounded-card border px-4 py-3 text-[15px] font-bold ${
                    active ? 'border-plum bg-plum-soft text-plum' : 'border-line bg-white text-ink'
                  }`}>
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              );
            })}
          </div>
        </Sheet>
      )}
    </>
  );
}
