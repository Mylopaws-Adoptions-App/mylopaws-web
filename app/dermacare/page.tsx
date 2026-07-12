'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { Therapy } from '@/lib/types';
import { PageShell, PillButton, LoadingState, EmptyState, ErrorState } from '@/components/design';

function Catalog() {
  const router = useRouter();
  const [rows, setRows] = useState<Therapy[] | null>(null);
  const [error, setError] = useState(false);

  const load = () => {
    setRows(null); setError(false);
    supabase.from('therapies').select('*').eq('active', true).order('sort_order')
      .then(({ data, error }) => { if (error) setError(true); else setRows((data as Therapy[]) ?? []); });
  };
  useEffect(load, []);

  return (
    <PageShell variant="plum" size="large" title="Dermacare" subtitle="Medicated skin & coat therapy" sheetClassName="pb-28">
      <p className="text-[13px] text-muted">Specialised therapy — not standard grooming. 4.9★ · 97 reviews · HSR Layout &amp; at-home.</p>

      {error ? (
        <ErrorState onRetry={load} />
      ) : !rows ? (
        <LoadingState label="Loading therapies…" />
      ) : rows.length === 0 ? (
        <EmptyState emoji="✨" title="No therapies available" sub="Please check back soon." />
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {rows.map(t => (
              <button key={t.id} onClick={() => router.push(`/dermacare/${t.id}`)}
                className="flex w-full items-center gap-4 rounded-card border border-line bg-white p-4 text-left shadow-card">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-plum-soft text-2xl">🛁</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-bold text-ink">{t.branded_name}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-muted">For: {t.target_symptoms}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[16px] font-bold text-plum">₹{t.price}</span>
                  <span className="block text-[12px] text-muted">~{t.duration_min} min</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-6"><PillButton onClick={() => router.push('/dermacare/book')}>Book therapies</PillButton></div>
        </>
      )}
      <Nav />
    </PageShell>
  );
}

export default function Page() { return <AuthGate><Catalog /></AuthGate>; }
