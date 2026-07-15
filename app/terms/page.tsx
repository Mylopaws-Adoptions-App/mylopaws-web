import type { Metadata } from 'next';
import { LegalShell } from '@/components/design';

export const metadata: Metadata = {
  title: 'Terms & Conditions — Mylopaws',
  description: 'The terms governing your use of Mylopaws pet travel, Dermacare, and Homes boarding services.',
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms & Conditions" updated="15 July 2026">
      <p className="lead">
        Welcome to Mylopaws. These Terms &amp; Conditions (&quot;Terms&quot;) govern your access to and use of the
        Mylopaws website, web app, and services (together, the &quot;Platform&quot;). By creating an account or
        booking any service, you agree to these Terms. If you do not agree, please do not use the Platform.
      </p>
      <p>
        Mylopaws (&quot;Mylopaws&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a pet-services platform operating in Bengaluru,
        Karnataka, India. For our full legal entity name and registered office details, contact
        support@mylopaws.com.
      </p>

      <h2>1. Eligibility &amp; accounts</h2>
      <ul>
        <li>You must be at least 18 years old and able to enter into a binding contract.</li>
        <li>You are responsible for the accuracy of the information you provide and for all activity under your account.</li>
        <li>You sign in with Google or with credentials we issue. Keep your access secure; notify us of any unauthorised use.</li>
      </ul>

      <h2>2. Our services</h2>
      <p>Mylopaws helps you book:</p>
      <ul>
        <li><strong>Pet Travel</strong> — pet-friendly cab rides within Bengaluru, provided by independent driver-partners.</li>
        <li><strong>Dermacare</strong> — specialised skin &amp; coat therapy and grooming, delivered by trained groomers/specialists at your home or our studio.</li>
        <li><strong>Mylopaws Homes</strong> — cat boarding provided by vetted home-boarding partners. Homes bookings are requests; the partner confirms availability and the final quote before any payment.</li>
      </ul>
      <p>
        Mylopaws acts as a facilitator connecting you with independent service providers and partners. Where a
        service is delivered by a partner, your booking also forms a service arrangement with that partner.
      </p>

      <h2>3. Bookings, estimates &amp; pricing</h2>
      <ul>
        <li>Prices and fare figures shown before you pay are <strong>estimates</strong>. Distances, route, waiting time, your pet&apos;s size and coat, and add-ons can change the final amount.</li>
        <li><strong>Pet Travel:</strong> you pay a booking fee to confirm the ride; the balance fare is collected after the trip.</li>
        <li><strong>Dermacare:</strong> the final price is assessed by our specialist based on your pet&apos;s size, coat, and condition, and is confirmed with you before the service begins.</li>
        <li><strong>Homes:</strong> the nightly rate shown is an estimate; the partner confirms the final quote before you pay.</li>
        <li>All amounts you are charged are calculated on our servers at the time of payment. We do not rely on any total computed on your device.</li>
      </ul>

      <h2>4. Payments</h2>
      <p>
        Payments are processed by our third-party payment gateway (Razorpay). By paying, you also agree to the
        gateway&apos;s terms. We do not store your full card or bank details. Taxes apply where required by law.
      </p>

      <h2>5. Your responsibilities &amp; your pet</h2>
      <ul>
        <li>Provide accurate details about your pet, including breed, temperament, aggression, medical conditions, and any risk to handlers. Withholding this can endanger people and animals and may lead to cancellation without refund.</li>
        <li>Ensure your pet is vaccinated and fit for the service booked.</li>
        <li>Be available (or have an authorised adult available) at the pickup/service address at the booked time.</li>
        <li>Treat our partners, drivers, and staff with respect. Abuse, harassment, or unsafe conditions may result in immediate cancellation and account suspension.</li>
      </ul>

      <h2>6. Health &amp; safety disclaimer</h2>
      <p>
        Dermacare is a grooming and skin &amp; coat care service. It is <strong>not</strong> a substitute for veterinary
        diagnosis or emergency care. If your pet is unwell or in distress, consult a licensed veterinarian. You
        confirm your pet is in a condition suitable for the booked service. We may decline or stop a service if
        continuing would be unsafe for the animal or handler.
      </p>

      <h2>7. Cancellations &amp; refunds</h2>
      <p>
        Cancellations, no-shows, and refunds are governed by our <a href="/cancellation">Cancellation &amp; Refund Policy</a>,
        which forms part of these Terms.
      </p>

      <h2>8. Prohibited use</h2>
      <ul>
        <li>Do not misuse the Platform, attempt to breach security, scrape data, or interfere with its operation.</li>
        <li>Do not book on behalf of another person without authority, provide false information, or use the Platform for unlawful purposes.</li>
      </ul>

      <h2>9. Intellectual property</h2>
      <p>
        The Mylopaws name, logo, content, and software are owned by us or our licensors and are protected by law.
        You may not copy, modify, or distribute them without our written permission.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Mylopaws is not liable for indirect, incidental, or consequential
        losses. Our total liability for any claim arising from a booking is limited to the amount you paid to
        Mylopaws for that booking. Nothing in these Terms limits liability that cannot be excluded under
        applicable law.
      </p>

      <h2>11. Indemnity</h2>
      <p>
        You agree to indemnify Mylopaws against claims and losses arising from your breach of these Terms, your
        misuse of the Platform, or inaccurate information you provide about your pet.
      </p>

      <h2>12. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be notified through the Platform. Your
        continued use after an update means you accept the revised Terms.
      </p>

      <h2>13. Governing law &amp; disputes</h2>
      <p>
        These Terms are governed by the laws of India. Subject to applicable law, the courts at Bengaluru,
        Karnataka have exclusive jurisdiction. We encourage you to contact us first so we can try to resolve any
        issue amicably.
      </p>

      <h2>14. Contact</h2>
      <p>
        Mylopaws · Bengaluru, India · support@mylopaws.com · WhatsApp +91 98874 45671.
      </p>
    </LegalShell>
  );
}
