'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { supabase } from '@/lib/supabase';
import { Therapy } from '@/lib/types';
import { PageShell, PillButton, LoadingState, ErrorState } from '@/components/design';

function Detail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [t, setT] = useState<Therapy | null>(null);
  const [error, setError] = useState(false);

  const load = () => {
    setT(null); setError(false);
    supabase.from('therapies').select('*').eq('id', id).single()
      .then(({ data, error }) => { if (error || !data) setError(true); else setT(data as Therapy); });
  };
  useEffect(load, [id]);

  if (error) return <PageShell variant="plum" size="compact" title="Dermacare" onBack={() => router.back()}><ErrorState onRetry={load} /></PageShell>;
  if (!t) return <PageShell variant="plum" size="compact" title="Dermacare" onBack={() => router.back()}><LoadingState /></PageShell>;

  return (
    <PageShell variant="plum" size="large" title={t.branded_name} onBack={() => router.back()}
      footer={<PillButton onClick={() => router.push(`/dermacare/book?preselect=${t.id}`)}>Book this therapy</PillButton>}>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-mint/40 p-3 text-center"><p className="text-[12px] text-muted">Price</p><p className="mt-0.5 text-[18px] font-bold text-plum">₹{t.price}</p></div>
        <div className="rounded-xl bg-mint/40 p-3 text-center"><p className="text-[12px] text-muted">Duration</p><p className="mt-0.5 text-[18px] font-bold text-ink">~{t.duration_min} min</p></div>
      </div>

      <section className="mt-6">
        <h2 className="text-[17px] font-bold text-plum">Is this for your furbaby?</h2>
        <p className="mt-1 text-[15px] leading-[1.55] text-body">{t.target_symptoms}</p>
      </section>

      {t.description && (
        <section className="mt-5">
          <h2 className="text-[17px] font-bold text-plum">What we do</h2>
          <p className="mt-1 text-[15px] leading-[1.55] text-body">{t.description}</p>
        </section>
      )}

      <a href={`https://wa.me/919148935441?text=${encodeURIComponent(`Hi! I have a question about ${t.branded_name}`)}`} target="_blank" rel="noreferrer"
        className="mt-6 flex min-h-[52px] items-center justify-center rounded-btn border-[1.5px] border-plum text-[15px] font-bold text-plum">
        Ask Vijay on WhatsApp 💬
      </a>
      <p className="mt-4 text-center text-[12px] text-muted">Dermacare hours: Mon–Sat, 11 AM – 6 PM</p>
    </PageShell>
  );
}

export default function Page() { return <AuthGate><Detail /></AuthGate>; }
