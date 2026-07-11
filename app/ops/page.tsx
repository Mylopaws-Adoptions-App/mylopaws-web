'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function OpsIndex() {
  const router = useRouter();
  useEffect(() => { router.replace('/ops/board/travel'); }, [router]);
  return null;
}
