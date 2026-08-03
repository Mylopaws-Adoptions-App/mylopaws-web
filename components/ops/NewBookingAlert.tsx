'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/lib/toast';
import { mediaFor } from '@/lib/media';

/**
 * Ops in-app alert for newly PAID bookings. Drop into a board that holds a live list of
 * payment_status='paid' orders (Travel / Dermacare). It diffs the list across realtime reloads and,
 * when a booking id it hasn't seen before appears, fires three cues:
 *   • a browser Notification (works even when the board tab is backgrounded — the real value),
 *   • a short chime, and
 *   • an in-page toast (always visible, even without notification permission).
 *
 * Detection is a seen-ids diff (not the realtime old/new payload), so it's exact regardless of the
 * table's replica identity, and it never double-fires on status changes to an already-paid order.
 * The first load only seeds the baseline — existing bookings never alert.
 *
 * In-app by design: it only fires while a teammate has the board open (the accepted tradeoff).
 */

type Row = { id: number; furbaby_name?: string | null; pawparent_name?: string | null };

// One shared AudioContext, unlocked on the "Enable alerts" gesture so later auto-chimes are allowed.
let audioCtx: AudioContext | null = null;
function chime() {
  try {
    if (typeof window === 'undefined') return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx ?? new Ctx();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    const now = audioCtx.currentTime;
    // Two quick rising tones — a friendly "ding-ding".
    [880, 1175].forEach((freq, i) => {
      const o = audioCtx!.createOscillator();
      const g = audioCtx!.createGain();
      o.connect(g); g.connect(audioCtx!.destination);
      o.type = 'sine'; o.frequency.value = freq;
      const t = now + i * 0.16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.start(t); o.stop(t + 0.3);
    });
  } catch { /* best-effort */ }
}

export default function NewBookingAlert({ orders, vertical, label }: {
  orders: Row[] | null;
  vertical: 'travel' | 'dermacare';
  label: string;
}) {
  const seen = useRef<Set<number> | null>(null);
  const [perm, setPerm] = useState<NotificationPermission>('default');

  useEffect(() => { if (typeof Notification !== 'undefined') setPerm(Notification.permission); }, []);

  useEffect(() => {
    if (!orders) return;
    // First list we ever see is the baseline — seed it and don't alert for pre-existing bookings.
    if (seen.current === null) { seen.current = new Set(orders.map(o => o.id)); return; }
    const fresh = orders.filter(o => !seen.current!.has(o.id));
    orders.forEach(o => seen.current!.add(o.id));
    if (!fresh.length) return;

    const n = fresh.length;
    const f = fresh[0];
    const title = `🐾 New ${label} booking${n > 1 ? `s · ${n}` : ''}`;
    const body = n === 1
      ? `#${f.id} · ${f.furbaby_name ?? 'Furbaby'}${f.pawparent_name ? ` (${f.pawparent_name})` : ''}`
      : `${n} new paid bookings just came in`;

    toast(`${title} — ${body}`, 'success', 6000);
    chime();
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification(title, { body, tag: `${vertical}-${f.id}`, icon: mediaFor('brandLogo') }); } catch { /* ignore */ }
    }
  }, [orders, vertical, label]);

  const enable = async () => {
    if (typeof Notification === 'undefined') { toast('This browser doesn’t support desktop notifications.', 'info'); return; }
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === 'granted') { chime(); toast('New-booking alerts are on 🔔', 'success'); }
    else toast('Alerts are blocked — turn on notifications for this site in your browser settings.', 'info');
  };

  if (perm === 'granted') return <span className="shrink-0 text-[12px] font-semibold text-success">🔔 Alerts on</span>;
  return (
    <button type="button" onClick={enable}
      className="shrink-0 rounded-full border-[1.5px] border-plum px-3 py-1.5 text-[12px] font-bold text-plum transition active:scale-95">
      🔔 Enable alerts
    </button>
  );
}
