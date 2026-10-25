'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function OpsIndex() {
  const router = useRouter();
  useEffect(() => { router.replace('/ops/shop'); }, [router]);
  return null;
}
