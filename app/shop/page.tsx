'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Old /shop links now land on the Amazon-style results page.
function Go() {
  const router = useRouter();
  const sp = useSearchParams();
  useEffect(() => {
    const u = new URLSearchParams();
    if (sp.get('c')) u.set('c', sp.get('c')!);
    if (sp.get('q')) u.set('k', sp.get('q')!);
    router.replace(u.toString() ? `/s?${u}` : '/categories');
  }, [router, sp]);
  return null;
}
export default function ShopRedirect() { return <Suspense fallback={null}><Go /></Suspense>; }
