'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { supabase } from '@/lib/supabase';
import { Service, rupees } from '@/lib/types';
import { PageShell, PillButton, LoadingState, ErrorState, Icons } from '@/components/design';

function Detail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [s, setS] = useState<Service | null>(null);
  const [error, setError] = useState(false);

  const load = () => {
    setS(null); setError(false);
    supabase.from('services').select('*').eq('id', id).eq('active', true).maybeSingle()
      .then(({ data, error }) => { if (error || !data) setError(true); else setS(data as Service); });
  };
  useEffect(load, [id]);

  if (error) return (
    <PageShell variant="plum" size="compact" title="Dermacare" onBack={() => router.push('/dermacare')}>
      <ErrorState title="Service not found" sub="This service may have changed. Browse our current services." onRetry={() => router.push('/dermacare')} />
    </PageShell>
  );
  if (!s) return <PageShell variant="plum" size="compact" title="Dermacare" onBack={() => router.push('/dermacare')}><LoadingState /></PageShell>;

  return (
    <PageShell variant="plum" size="large" title={s.name} subtitle={s.tagline ?? undefined} onBack={() => router.push('/dermacare')}
      footer={<PillButton onClick={() => router.push(`/dermacare/book?service=${s.id}`)}>Book {s.name}</PillButton>}>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-mint/40 p-3 text-center"><p className="text-[12px] text-muted">From</p><p className="mt-0.5 text-[18px] font-bold text-plum">{rupees(s.base_price)}</p></div>
        <div className="rounded-xl bg-mint/40 p-3 text-center"><p className="text-[12px] text-muted">Duration</p><p className="mt-0.5 text-[18px] font-bold text-ink">~{s.duration_min} min</p></div>
      </div>

      {s.includes && s.includes.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[17px] font-bold text-plum">What&apos;s included</h2>
          <ul className="mt-3 space-y-2">
            {s.includes.map((it) => (
              <li key={it} className="flex items-start gap-2 text-[15px] text-body">
                <Icons.Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {it}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-[12px] leading-[1.5] text-muted">Final price is confirmed by our specialist based on your pet&apos;s size and coat — you&apos;ll be told before we begin.</p>
    </PageShell>
  );
}

export default function Page() { return <AuthGate><Detail /></AuthGate>; }
