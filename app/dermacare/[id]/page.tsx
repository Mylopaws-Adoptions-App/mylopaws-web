'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { Therapy } from '@/lib/types';
import { Btn, Card, Spinner } from '@/components/ui';

function Detail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [t, setT] = useState<Therapy | null>(null);
  useEffect(() => { supabase.from('therapies').select('*').eq('id', id).single().then(({ data }) => setT(data as Therapy)); }, [id]);
  if (!t) return <Spinner />;
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="font-display text-3xl font-black leading-tight">{t.branded_name}</h1>
      <p className="mt-2 text-lg"><span className="font-display font-black text-magenta">₹{t.price}</span> <span className="text-sm text-ink-soft">· ~{t.duration_min} min session</span></p>
      <Card className="mt-5"><p className="font-bold text-magenta">Is this for your furbaby?</p><p className="mt-1 leading-relaxed">{t.target_symptoms}</p></Card>
      <Card className="mt-3"><p className="font-bold text-magenta">What we do</p><p className="mt-1 leading-relaxed">{t.description}</p></Card>
      <Btn onClick={() => router.push(`/dermacare/book?preselect=${t.id}`)} className="mt-6 w-full">Book this therapy</Btn>
      <a href={`https://wa.me/919148935441?text=${encodeURIComponent(`Hi! I have a question about ${t.branded_name}`)}`} target="_blank" rel="noreferrer"
        className="mt-3 flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-magenta font-bold text-magenta hover:bg-magenta/5">
        Ask Vijay on WhatsApp 💬
      </a>
      <p className="mt-4 text-center text-xs text-ink-soft">Dermacare hours: Mon–Sat, 11 AM – 6 PM</p>
    </main>
  );
}
export default function Page() { return <AuthGate><><Nav /><Detail /></></AuthGate>; }
