'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from './PageShell';

/**
 * Shared reading layout for the public policy pages (Terms, Privacy, Cancellation).
 * Compact plum header + a `.legal` prose scope (styled in globals.css). Public — no AuthGate.
 * Cross-links the three policies at the foot so a reader can move between them.
 */
export function LegalShell({
  title, updated, children,
}: { title: string; updated: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <PageShell variant="plum" size="compact" title={title} onBack={() => router.back()}>
      <p className="text-[12px] text-muted">Last updated: {updated}</p>
      <div className="legal mt-3 pb-6">{children}</div>

      <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-5 text-[13px] font-semibold text-plum">
        <Link href="/terms" className="underline underline-offset-4">Terms</Link>
        <Link href="/privacy" className="underline underline-offset-4">Privacy</Link>
        <Link href="/cancellation" className="underline underline-offset-4">Cancellation</Link>
      </div>
      <p className="mt-3 text-[12px] leading-[1.5] text-muted">
        Questions? WhatsApp us at +91 98874 45671 or email support@mylopaws.com.
      </p>
    </PageShell>
  );
}
