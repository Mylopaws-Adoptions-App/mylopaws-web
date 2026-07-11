'use client';
import { useState } from 'react';
import { invokeFn } from '@/lib/supabase';
import { Btn, Card, Chip, Field } from '@/components/ui';

const SEGMENTS = [
  { key: 'all', label: 'All customers' },
  { key: 'travel_30d', label: 'Travel — last 30d' },
  { key: 'dermacare_30d', label: 'Dermacare — last 30d' },
];

export default function Composer() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState('all');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const send = async () => {
    if (!title.trim() || !body.trim()) { setMsg('Both title and message are required.'); return; }
    if (!confirm(`Send "${title}" to ${SEGMENTS.find(s => s.key === segment)?.label}? This goes to real customer devices.`)) return;
    setBusy(true); setMsg('');
    try {
      const res = await invokeFn('send-push', { mode: 'broadcast', title: title.trim(), body: body.trim(), segment });
      setMsg(`✓ Delivered to ${res.sent} device(s).`); setTitle(''); setBody('');
    } catch (e: any) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  return (
    <main className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="font-display text-2xl font-black">📣 Push Composer</h1>
      <Card className="mt-4">
        <p className="mb-2 font-bold text-night">Audience</p>
        <div className="flex flex-wrap">
          {SEGMENTS.map(s => <Chip key={s.key} label={s.label} selected={segment === s.key} onClick={() => setSegment(s.key)} />)}
        </div>
      </Card>
      <Card className="mt-4">
        <Field label="Title" value={title} onChange={e => setTitle(e.target.value)} maxLength={60} placeholder="e.g. Monsoon skin alert! 🌧" />
        <Field label="Message" value={body} onChange={e => setBody(e.target.value)} maxLength={160} placeholder="e.g. Fungal infections spike in the rains — book a Skin Infection Recovery Therapy this week." />
        {msg && <p className="mb-2 text-sm font-semibold text-magenta">{msg}</p>}
        <Btn kind="secondary" onClick={send} loading={busy}>Review & send</Btn>
      </Card>
      <p className="mt-3 text-center text-xs text-ink-soft">Pushes reach customers using the mobile app. Sends are instant — keep it useful.</p>
    </main>
  );
}
