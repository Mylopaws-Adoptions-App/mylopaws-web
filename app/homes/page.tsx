'use client';
import Link from 'next/link';
import AuthGate from '@/components/AuthGate';
import { Btn, Card } from '@/components/ui';
import { PhotoBg } from '@/components/design';
import { HOMES_PROVIDER, HOMES_RATE_PER_NIGHT } from '@/lib/types';

// ---- Edit Joanna's details here ----
const AREA = 'HSR Layout, Bengaluru';        // TODO: confirm exact locality
const CAPACITY = 'Up to 4 cats at a time';   // TODO: confirm capacity
const HIGHLIGHTS = [
  { icon: '🐱', title: 'Cats only', sub: 'A calm, dog-free home so your cat stays relaxed.' },
  { icon: '🏡', title: 'Real home, not cages', sub: 'Free-roam rooms with cozy nooks and sunny spots.' },
  { icon: '📸', title: 'Daily photo updates', sub: 'Get pictures & notes every day on WhatsApp.' },
  { icon: '💉', title: 'Health-first', sub: 'Vaccinated-only guests; litter, food & meds handled.' },
];

function Homes() {
  return (
    <main className="mx-auto max-w-3xl px-5 pt-8 pb-28">
      <Link href="/" className="text-sm font-bold text-ink-soft hover:text-magenta">← Home</Link>

      <div className="relative mt-3 min-h-[220px] overflow-hidden rounded-3xl bg-night p-7 text-white">
        <PhotoBg srcKey="homesCard" alt="A cat and dog resting peacefully together" priority
          overlay="from-night via-night/80 to-night/40" />
        <div className="relative z-10">
          <span className="inline-block rounded-full bg-brass/30 px-3 py-1 text-[11px] font-black text-brass">MYLOPAWS HOMES · NOW BOOKING</span>
          <h1 className="mt-3 font-display text-4xl font-black">Cat Boarding 🐱</h1>
          <p className="mt-2 max-w-md text-white/85">Loving, at-home boarding for your cat while you travel — vetted, cats-only, and stress-free.</p>
        </div>
      </div>

      <Card className="mt-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-magenta text-2xl text-white">🏡</div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-black">{HOMES_PROVIDER}</h2>
            <p className="text-sm text-ink-soft">{AREA} · ⭐ 4.9 · {CAPACITY}</p>
          </div>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-ink">
          Run by Joanna, a lifelong cat person, {HOMES_PROVIDER} gives your furbaby a quiet home away from home —
          plenty of cuddles, play, and daily updates so you can travel worry-free.
        </p>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {HIGHLIGHTS.map(h => (
          <Card key={h.title} className="flex items-start gap-3">
            <div className="text-2xl">{h.icon}</div>
            <div>
              <p className="font-bold">{h.title}</p>
              <p className="text-sm text-ink-soft">{h.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-4 !border-brass bg-[#FFF9EC]">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold">Boarding rate</p>
            <p className="text-sm text-ink-soft">Per cat, per night · final quote on confirmation</p>
          </div>
          <div className="font-display text-2xl font-black text-magenta">₹{HOMES_RATE_PER_NIGHT}<span className="text-sm text-ink-soft">/night</span></div>
        </div>
      </Card>

      <div className="mt-6 mb-10">
        <Link href="/homes/book"><Btn className="w-full">Request a stay →</Btn></Link>
        <p className="mt-3 text-center text-xs text-ink-soft">Send your dates and we’ll confirm availability with Joanna, usually within a few hours.</p>
      </div>
    </main>
  );
}
export default function Page() { return <AuthGate><Homes /></AuthGate>; }
