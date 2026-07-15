import type { Metadata } from 'next';
import { LegalShell } from '@/components/design';

export const metadata: Metadata = {
  title: 'Cancellation & Refund Policy — Mylopaws',
  description: 'How to cancel or reschedule Mylopaws bookings, and how refunds work across Travel, Dermacare, and Homes.',
};

export default function CancellationPage() {
  return (
    <LegalShell title="Cancellation & Refund Policy" updated="15 July 2026">
      <p className="lead">
        We know plans change. This policy explains how to cancel or reschedule a Mylopaws booking and how refunds
        work for each service. It forms part of our <a href="/terms">Terms &amp; Conditions</a>.
      </p>

      <h2>1. How to cancel</h2>
      <p>
        You can cancel or request changes from your <strong>Bookings</strong> screen in the app, or by WhatsApp at
        +91 98874 45671. Please cancel as early as possible — it helps us free up a driver, groomer, or boarding
        space for someone else.
      </p>

      <h2>2. Pet Travel</h2>
      <ul>
        <li>The <strong>booking fee</strong> confirms your ride and reserves a driver-partner. It is refundable if you cancel <strong>before a driver is assigned/on the way</strong>.</li>
        <li>Once a driver is assigned or en route, the booking fee is non-refundable, as the partner has committed time and travel.</li>
        <li>The balance fare is only charged after the trip, so there is nothing further to refund on a cancelled ride.</li>
        <li>If <strong>we or the driver-partner cancel</strong> your ride, you receive a full refund of the booking fee.</li>
      </ul>

      <h2>3. Dermacare</h2>
      <ul>
        <li>You may cancel or reschedule <strong>free of charge up to 4 hours before</strong> your appointment.</li>
        <li>Cancellations within 4 hours, or a <strong>no-show</strong> when our specialist has already travelled to you, may attract a visit/convenience charge to cover the partner&apos;s time and travel.</li>
        <li>Since the final Dermacare price is confirmed with you before the service begins, you can decline at that point without paying for the service (a visit charge may still apply if the specialist has travelled to you).</li>
        <li>If we cannot serve you as booked, we will reschedule at your convenience or refund any amount paid for that booking.</li>
      </ul>

      <h2>4. Mylopaws Homes (cat boarding)</h2>
      <ul>
        <li>Homes bookings are <strong>requests</strong>. No payment is taken until the boarding partner (e.g. Joanna) confirms availability and the final quote — so an unconfirmed request can be withdrawn at any time at no cost.</li>
        <li>For a confirmed stay, cancel <strong>at least 48 hours before check-in</strong> for a full refund of any advance paid.</li>
        <li>Cancellations within 48 hours of check-in, or early check-out during a stay, may be charged up to one night&apos;s rate (or the agreed deposit) to compensate the partner for the reserved space.</li>
        <li>If the <strong>boarding partner cancels</strong>, you receive a full refund and we will try to arrange a suitable alternative.</li>
      </ul>

      <h2>5. No-shows</h2>
      <p>
        A no-show is failing to be available at the booked time and place without notice. No-shows are treated as
        late cancellations and the charges above may apply, because the partner has held the slot for you.
      </p>

      <h2>6. How refunds are paid</h2>
      <ul>
        <li>Approved refunds are made to your original payment method through Razorpay.</li>
        <li>Refunds are typically processed within <strong>5–7 business days</strong>, though your bank may take a little longer to reflect them.</li>
        <li>Any payment-gateway or third-party charges that are non-recoverable may be deducted where permitted.</li>
      </ul>

      <h2>7. Exceptional circumstances</h2>
      <p>
        We handle genuine emergencies — a pet&apos;s illness, a medical emergency, or events beyond your control — with
        care and flexibility. Reach out and we&apos;ll do our best to help.
      </p>

      <h2>8. Contact</h2>
      <p>
        Mylopaws · Bengaluru, India · support@mylopaws.com · WhatsApp +91 98874 45671.
      </p>
    </LegalShell>
  );
}
