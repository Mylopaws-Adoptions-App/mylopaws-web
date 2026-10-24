'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useShop } from './ShopProvider';
import { inr } from '@/lib/shop';
import { CartIcon } from '@/components/design/nav-icons';
import { Icons } from '@/components/design';

// Floating cart summary (quick-commerce style) that sits just above the tab bar on browse screens.
const SHOW_ON = ['/', '/shop'];

export default function CartBar() {
  const path = usePathname() ?? '';
  const { count, subtotal, delivery } = useShop();
  const show = count > 0 && SHOW_ON.some((p) => (p === '/' ? path === '/' : path === p || path.startsWith(p.endsWith('/') ? p : p + '/')));
  if (!show) return null;
  const gap = delivery.free_min - subtotal;
  return (
    <div className="fixed bottom-[calc(64px_+_env(safe-area-inset-bottom))] left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 px-4">
      <Link href="/cart" className="mp-fade flex items-center justify-between rounded-[18px] bg-plum px-4 py-3 text-white shadow-floating active:scale-[0.99]">
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><CartIcon className="h-5 w-5" /></span>
          <span>
            <span className="block text-[14px] font-bold">{count} item{count > 1 ? 's' : ''} · {inr(subtotal)}</span>
            <span className="block text-[11px] text-white/80">{gap > 0 ? `${inr(gap)} more for free delivery` : 'Free delivery unlocked 🎉'}</span>
          </span>
        </span>
        <span className="flex items-center gap-1 text-[14px] font-bold">View cart <Icons.ChevronRight className="h-4 w-4" /></span>
      </Link>
    </div>
  );
}
