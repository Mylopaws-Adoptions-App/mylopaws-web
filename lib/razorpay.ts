'use client';
import { invokeFn, supabase } from './supabase';

function loadCheckout(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load payment gateway'));
    document.body.appendChild(s);
  });
}

export type PayOutcome = 'captured' | 'dismissed';

// Creates the order server-side (amount computed there), opens web checkout.
// Returns 'captured' if the client handler fired, 'dismissed' if the sheet was closed
// without paying. NOTE: 'captured' is only the CLIENT's word — it is NOT proof of payment.
// Always follow with confirmPaid(), which reads the webhook-verified payment_status.
export async function payForOrder(
  orderType: 'travel' | 'dermacare',
  orderId: number,
  opts: { name?: string; email?: string; contact?: string } = {},
): Promise<PayOutcome> {
  await loadCheckout();
  const rzp = await invokeFn('razorpay-create-order', { order_type: orderType, order_id: orderId });
  return new Promise((resolve) => {
    let settled = false;
    const done = (o: PayOutcome) => { if (!settled) { settled = true; resolve(o); } };
    const r = new (window as any).Razorpay({
      key: rzp.key_id,
      order_id: rzp.razorpay_order_id,
      amount: rzp.amount * 100,
      currency: 'INR',
      name: 'Mylopaws',
      description: `${orderType === 'travel' ? 'Booking fee' : 'Therapy'} — #${orderId}`,
      prefill: { name: opts.name, email: opts.email, contact: opts.contact },
      theme: { color: '#691A47' },
      handler: () => done('captured'),
      modal: { ondismiss: () => done('dismissed') },
    });
    r.open();
  });
}

export type PaidResult = 'paid' | 'failed' | 'pending';

// SERVER-VERIFIED payment check. Polls the order's payment_status (flipped only by the
// Razorpay webhook, service-role) until it is 'paid'/'failed', or the timeout is hit.
// 'pending' means we couldn't confirm in time (do NOT show success — treat as not-yet-paid).
export async function confirmPaid(
  orderType: 'travel' | 'dermacare',
  orderId: number,
  { timeoutMs = 20000, intervalMs = 1500 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<PaidResult> {
  const table = orderType === 'travel' ? 'orders' : 'dermacare_orders';
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { data } = await supabase.from(table).select('payment_status').eq('id', orderId).single();
    if (data?.payment_status === 'paid') return 'paid';
    if (data?.payment_status === 'failed') return 'failed';
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return 'pending';
}
