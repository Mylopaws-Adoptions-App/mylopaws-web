'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { Service, rupees } from '@/lib/types';
import { PageShell, PillButton, LoadingState, EmptyState, ErrorState, Icons, Photo } from '@/components/design';

const DERMACARE_WA = '919148935441';

// The medicated protocols behind the price — substance drawn from our therapy library,
// presented as what's inside the service (not separate SKUs).
const TREATS = [
  'Skin infections, red patches & odour',
  'Dandruff, dryness & flaking',
  'Allergy-driven itching & sensitive skin',
  'Ticks, fleas & heavy shedding',
];

function ServiceCard({ s, onBook }: { s: Service; onBook: () => void }) {
  return (
    <button onClick={onBook}
      className={`w-full rounded-card border bg-white p-5 text-left shadow-card ${s.popular ? 'border-plum' : 'border-line'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {s.popular && <span className="mb-1 inline-block rounded-full bg-butter px-2 py-0.5 text-[10px] font-bold text-plum">MOST BOOKED</span>}
          <h3 className="text-[18px] font-bold text-ink">{s.name}</h3>
          {s.tagline && <p className="mt-0.5 text-[13px] text-muted">{s.tagline}</p>}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[12px] text-muted">from</div>
          <div className="text-[20px] font-extrabold text-plum">{rupees(s.base_price)}</div>
          <div className="text-[12px] text-muted">~{s.duration_min} min</div>
        </div>
      </div>
      {s.includes && s.includes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {s.includes.map((it) => (
            <li key={it} className="flex items-start gap-2 text-[13px] text-body">
              <Icons.Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> {it}
            </li>
          ))}
        </ul>
      )}
      <span className="mt-4 inline-flex items-center gap-1 text-[14px] font-bold text-plum">
        Book {s.name} <Icons.ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
}

function Catalog() {
  const router = useRouter();
  const [rows, setRows] = useState<Service[] | null>(null);
  const [error, setError] = useState(false);

  const load = () => {
    setRows(null); setError(false);
    supabase.from('services').select('*').eq('active', true).order('sort_order')
      .then(({ data, error }) => { if (error) setError(true); else setRows((data as Service[]) ?? []); });
  };
  useEffect(load, []);

  return (
    <PageShell variant="plum" size="large" title="Dermacare" subtitle="Specialised skin & coat therapy — not standard grooming" sheetClassName="pb-28">
      <p className="text-[13px] text-muted">4.9★ from 97 pawparents · at your home or our HSR Layout studio.</p>

      <Photo srcKey="dermacareCard" alt="A vet giving a dog a skin & coat assessment" priority
        className="mt-4 aspect-[16/10] w-full"
        overlay="from-black/45 via-transparent to-transparent" />

      {error ? (
        <ErrorState onRetry={load} />
      ) : !rows ? (
        <LoadingState label="Loading services…" />
      ) : rows.length === 0 ? (
        <EmptyState emoji="✨" title="No services available" sub="Please check back soon." />
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {rows.map((s) => <ServiceCard key={s.id} s={s} onBook={() => router.push(`/dermacare/book?service=${s.id}`)} />)}
          </div>

          {/* Credibility — why this isn't a ₹600 street groomer */}
          <section className="mt-8 rounded-card bg-plum-soft p-5">
            <h2 className="text-[17px] font-bold text-plum">Therapy, not just a wash</h2>
            <p className="mt-1.5 text-[14px] leading-[1.55] text-body">
              Every session uses medicated <span className="font-semibold">Virbac</span> protocols —
              Ketochlor, Allermyl, Sebolytic and Episoothe — chosen for your pet&apos;s skin, and finished
              with a specialist skin assessment. We treat the condition, not just the coat.
            </p>
            <ul className="mt-3 space-y-1.5">
              {TREATS.map((t) => (
                <li key={t} className="flex items-start gap-2 text-[13px] text-body">
                  <Icons.Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> {t}
                </li>
              ))}
            </ul>
          </section>

          <a href={`https://wa.me/${DERMACARE_WA}?text=${encodeURIComponent('Hi! I have a question about Dermacare pricing for my pet.')}`}
            target="_blank" rel="noreferrer"
            className="mt-4 flex min-h-[52px] items-center justify-center rounded-btn border-[1.5px] border-plum text-[15px] font-bold text-plum">
            Ask Vijay on WhatsApp 💬
          </a>
          <p className="mt-3 text-center text-[12px] text-muted">Final price is assessed per pet — size &amp; coat. Ask Vijay for a quote.</p>
        </>
      )}
      <Nav />
    </PageShell>
  );
}

export default function Page() { return <AuthGate><Catalog /></AuthGate>; }
