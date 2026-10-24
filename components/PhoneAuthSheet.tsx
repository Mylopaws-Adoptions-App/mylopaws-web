'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { Sheet, PillButton } from '@/components/design';

/**
 * PhoneAuthSheet — passwordless phone + OTP sign-in / sign-up (India, +91).
 *
 * Uses the Sheet's top-anchored `align="search"` presentation: the input sits at the TOP under a
 * sticky header so the mobile keyboard opens BELOW it and can never cover it (a bottom sheet would
 * have to lift above the keyboard, which is fragile once the field autofocuses on open).
 *
 * Two steps:
 *   1) phone   → supabase.auth.signInWithOtp({ phone })   (Supabase delivers the OTP via the native
 *                Twilio / Twilio Verify phone provider configured in the dashboard).
 *   2) otp     → supabase.auth.verifyOtp({ phone, token, type: 'sms' })  → session created inline.
 *
 * The client flow is provider-agnostic — Twilio vs Twilio Verify is purely a Supabase dashboard
 * setting, no code change here. On success the session lands in the client; AuthGate's
 * onAuthStateChange upserts the customer row and we route to '/'. No OAuth redirect / callback page.
 */

const OTP_LEN = 6;
const RESEND_SECONDS = 30;

export default function PhoneAuthSheet({ open, onClose, onVerified, title }: { open: boolean; onClose: () => void; onVerified?: () => void; title?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState(''); // 10-digit local part only; +91 is fixed
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const e164 = `+91${phone}`;
  const phoneValid = /^[6-9]\d{9}$/.test(phone); // Indian mobile numbers start 6–9
  const otpValid = new RegExp(`^\\d{${OTP_LEN}}$`).test(otp);

  // Reset to a clean state whenever the sheet is dismissed.
  useEffect(() => {
    if (!open) { setStep('phone'); setOtp(''); setErr(null); setBusy(false); setCooldown(0); }
  }, [open]);

  // Resend cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendOtp = async () => {
    if (!phoneValid) { setErr('Enter a valid 10-digit mobile number.'); return; }
    setBusy(true); setErr(null);
    track('login_start', { method: 'phone' });
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setStep('otp'); setCooldown(RESEND_SECONDS);
  };

  const verify = async () => {
    if (!otpValid) { setErr(`Enter the ${OTP_LEN}-digit code.`); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.verifyOtp({ phone: e164, token: otp, type: 'sms' });
    if (error) {
      setBusy(false);
      setErr(/expired|invalid/i.test(error.message) ? 'That code is incorrect or has expired. Please try again.' : error.message);
      return;
    }
    track('login', { method: 'phone' });
    // Session is set; onAuthStateChange picks it up. Callers in the middle of a flow (checkout)
    // stay where they are; otherwise head to the home surface.
    if (onVerified) { setBusy(false); onVerified(); return; }
    router.replace('/');
  };

  return (
    <Sheet open={open} onClose={onClose} align="search" closeLabel="Close sign in"
      title={step === 'phone' ? (title ?? 'Sign in / Sign up') : 'Enter the code'}>
      {step === 'phone' ? (
        <>
          <p className="-mt-1 mb-4 text-[14px] leading-[1.5] text-body">
            We&apos;ll text you a one-time code — no passwords, no fuss. 🐾
          </p>
          <label className="mb-3 block">
            <span className="mb-1.5 block text-[13px] font-medium text-muted">Mobile number</span>
            <div className="flex items-stretch gap-2">
              <span className="inline-flex min-h-[52px] items-center rounded-input border border-line bg-surface-alt px-3 text-[15px] font-semibold text-ink">+91</span>
              <input
                type="tel" inputMode="numeric" autoComplete="tel-national" autoFocus
                placeholder="98765 43210" maxLength={10} aria-label="Mobile number"
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setErr(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') sendOtp(); }}
                className="min-h-[52px] w-full rounded-input border border-line bg-surface-alt px-4 text-[15px] tracking-wide text-ink outline-none placeholder:text-muted focus:border-plum"
              />
            </div>
          </label>
          {err && <p className="mb-3 text-[13px] font-medium text-danger">{err}</p>}
          <PillButton onClick={sendOtp} loading={busy} disabled={!phoneValid}>Get OTP</PillButton>
          <p className="mt-4 text-center text-[12px] leading-[1.5] text-muted">
            By continuing you agree to our{' '}
            <Link href="/terms" className="font-medium text-plum underline underline-offset-2">Terms</Link> and{' '}
            <Link href="/privacy" className="font-medium text-plum underline underline-offset-2">Privacy Policy</Link>.
          </p>
        </>
      ) : (
        <>
          <p className="-mt-1 mb-4 text-[14px] leading-[1.5] text-body">
            Enter the {OTP_LEN}-digit code sent to <span className="font-semibold text-ink">+91 {phone}</span>.{' '}
            <button type="button" onClick={() => { setStep('phone'); setErr(null); }}
              className="font-semibold text-plum underline underline-offset-2">Change</button>
          </p>
          <input
            type="tel" inputMode="numeric" autoComplete="one-time-code" autoFocus
            placeholder="••••••" maxLength={OTP_LEN} aria-label="One-time code"
            value={otp}
            onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LEN)); setErr(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') verify(); }}
            className="mb-3 min-h-[56px] w-full rounded-input border border-line bg-surface-alt px-4 text-center text-[24px] font-bold tracking-[0.5em] text-ink outline-none placeholder:tracking-[0.3em] placeholder:text-muted focus:border-plum"
          />
          {err && <p className="mb-3 text-[13px] font-medium text-danger">{err}</p>}
          <PillButton onClick={verify} loading={busy} disabled={!otpValid}>Verify &amp; continue</PillButton>
          <button type="button" disabled={cooldown > 0 || busy} onClick={sendOtp}
            className="mx-auto mt-4 block min-h-[44px] text-[13px] font-semibold text-plum disabled:text-muted">
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        </>
      )}
    </Sheet>
  );
}
