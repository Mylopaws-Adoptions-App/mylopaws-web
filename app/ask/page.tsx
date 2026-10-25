'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import MyloChat, { productRef } from '@/components/shop/MyloChat';

// Full-page Ask Mylo (deep links: /ask?q=…, /ask?product=handle). The same chat opens as a sheet across the app.
function AskInner() {
  const sp = useSearchParams();
  const q = sp.get('q') ?? undefined;
  const ph = sp.get('product');
  const [product, setProduct] = useState<{ handle: string; title: string } | null | undefined>(ph ? undefined : null);
  useEffect(() => { if (ph) productRef(ph).then((p) => setProduct(p)); }, [ph]);
  if (product === undefined) return null;
  return <div className="mx-auto max-w-[480px]"><MyloChat fullPage prompt={q} product={product ?? undefined} /></div>;
}
export default function AskPage() { return <Suspense fallback={null}><AskInner /></Suspense>; }
