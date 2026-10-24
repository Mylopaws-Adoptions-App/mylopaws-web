'use client';
import Link from 'next/link';
import { PawIcon } from '@/components/design/nav-icons';

/** Rufus-style entry point: a search-looking box that opens Ask Mylo (optionally about one product). */
export default function AskBar({ placeholder = 'Ask Mylo: "my dog has ticks"…', product, className = '' }: { placeholder?: string; product?: string; className?: string }) {
  const href = product ? `/ask?product=${encodeURIComponent(product)}` : '/ask';
  return (
    <Link href={href} className={`flex min-h-[52px] items-center gap-3 rounded-full border-[1.5px] border-plum bg-white px-4 shadow-card active:scale-[0.99] ${className}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-plum text-white"><PawIcon className="h-[18px] w-[18px]" /></span>
      <span className="truncate text-[14px] text-muted">{placeholder}</span>
    </Link>
  );
}
