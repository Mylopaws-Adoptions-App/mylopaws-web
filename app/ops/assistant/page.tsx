'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Empty, Spinner } from '@/components/ui';

export default function Assistant() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    supabase.from('conversation_summaries').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => setRows(data ?? []));
  }, []);
  if (!rows) return <Spinner label="Loading Anannya's call summaries…" />;
  return (
    <main className="mx-auto max-w-3xl px-5 py-6">
      <h1 className="font-display text-2xl font-black">🎙 Assistant — Anannya's calls</h1>
      {rows.length === 0
        ? <Empty emoji="🎙" title="No conversations yet" sub="Summaries land here after each voice call on mylopaws.com." />
        : <div className="mt-4 space-y-3">
            {rows.map(r => (
              <div key={r.id} className="rounded-2xl bg-[#F7F1EC] p-4">
                <p className="font-bold text-magenta">{r.caller_name ?? 'Unknown caller'}</p>
                {r.caller_phone && <p className="text-xs text-ink-soft">{r.caller_phone}</p>}
                <p className="mt-2 leading-relaxed">{r.summary}</p>
                <p className="mt-2 text-xs text-ink-soft">{new Date(r.created_at).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>}
    </main>
  );
}
