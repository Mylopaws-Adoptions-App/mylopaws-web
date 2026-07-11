'use client';
import { invokeFn } from './supabase';

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

// Creates the order server-side (amount computed there), opens web checkout.
export async function payForOrder(orderType: 'travel' | 'dermacare', orderId: number, opts: { name?: string; email?: string; contact?: string } = {}): Promise<boolean> {
  await loadCheckout();
  const rzp = await invokeFn('razorpay-create-order', { order_type: orderType, order_id: orderId });
  return new Promise((resolve) => {
    const r = new (window as any).Razorpay({
      key: rzp.key_id,
      order_id: rzp.razorpay_order_id,
      amount: rzp.amount * 100,
      currency: 'INR',
      name: 'Mylopaws',
      description: `${orderType === 'travel' ? 'Booking fee' : 'Therapy'} — #${orderId}`,
      prefill: { name: opts.name, email: opts.email, contact: opts.contact },
      theme: { color: '#691A47' },
      handler: () => resolve(true),
      modal: { ondismiss: () => resolve(false) },
    });
    r.open();
  });
}
