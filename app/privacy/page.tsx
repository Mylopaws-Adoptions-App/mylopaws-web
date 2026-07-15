import type { Metadata } from 'next';
import { LegalShell } from '@/components/design';

export const metadata: Metadata = {
  title: 'Privacy Policy — Mylopaws',
  description: 'How Mylopaws collects, uses, shares, and protects your personal data, and your rights under India’s DPDP Act.',
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="15 July 2026">
      <p className="lead">
        This Privacy Policy explains how Mylopaws (&quot;we&quot;, &quot;us&quot;) collects, uses, shares, and protects your
        personal data when you use our Platform, and the rights you have under India&apos;s Digital Personal Data
        Protection Act, 2023 (&quot;DPDP Act&quot;). We are the Data Fiduciary for the data we process about you.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account &amp; contact:</strong> name, email, phone number, and city — via Google sign-in or the credentials you use.</li>
        <li><strong>Pet details:</strong> name, breed, age, temperament/aggression, and any medical or critical notes you provide.</li>
        <li><strong>Booking details:</strong> pickup/drop and service addresses, dates and times, and service selections.</li>
        <li><strong>Location:</strong> the addresses and coordinates you enter (via Google Maps) to compute routes and fares. We do not track your device&apos;s live location for the customer app.</li>
        <li><strong>Payments:</strong> handled by Razorpay. We receive confirmation of payment status and amounts, not your full card/bank details.</li>
        <li><strong>Technical:</strong> push-notification tokens (if you enable notifications) and basic app/usage logs needed to run the service.</li>
      </ul>

      <h2>2. How we use your data</h2>
      <ul>
        <li>To create and manage your account and provide the services you book.</li>
        <li>To calculate estimates and final amounts, take payment, and share the details a driver, groomer, or boarding partner needs to serve you.</li>
        <li>To send booking updates and, where enabled, push notifications.</li>
        <li>To provide support, keep the Platform secure, prevent fraud, and meet legal obligations.</li>
      </ul>

      <h2>3. Legal basis &amp; consent</h2>
      <p>
        We process your data based on your consent and to perform the services you request. Your consent is
        specific, informed, and can be withdrawn at any time (see Section 7). Withdrawing consent may mean we can
        no longer provide certain services.
      </p>

      <h2>4. Who we share data with</h2>
      <ul>
        <li><strong>Service providers &amp; partners:</strong> the driver-partner, groomer/specialist, or boarding partner fulfilling your booking receives only the details needed (e.g. name, contact, address, pet details, timing).</li>
        <li><strong>Processors:</strong> Supabase (secure database &amp; authentication hosting), Google (sign-in and Maps), and Razorpay (payments). They process data on our behalf under their own safeguards.</li>
        <li><strong>Legal:</strong> authorities where required by law, or to protect rights, safety, and the integrity of the Platform.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>5. Data retention</h2>
      <p>
        We keep your data for as long as your account is active and as needed to provide services, resolve
        disputes, and meet legal, tax, and accounting requirements. When no longer needed, we delete or anonymise
        it.
      </p>

      <h2>6. Security</h2>
      <p>
        We use access controls, row-level security, encryption in transit, and trusted infrastructure providers to
        protect your data. No system is perfectly secure, but we work to protect your information and will notify
        you and the authorities of a significant breach as required by law.
      </p>

      <h2>7. Your rights</h2>
      <p>Under the DPDP Act, you have the right to:</p>
      <ul>
        <li>Access a summary of the personal data we process about you and how we use it.</li>
        <li>Correct, complete, or update inaccurate data, and erase data processed on your consent (subject to legal retention).</li>
        <li>Withdraw your consent, with the same ease as giving it.</li>
        <li>Nominate another person to exercise your rights in the event of your death or incapacity.</li>
        <li>Grieve or complain about how we handle your data.</li>
      </ul>
      <p>
        To exercise any right, email support@mylopaws.com from your registered email, or WhatsApp +91 98874 45671.
        You can update pet, address, and profile details directly in the app, and delete your account by contacting us.
      </p>

      <h2>8. Grievance Officer</h2>
      <p>
        For privacy questions, requests, or complaints, contact our Grievance Officer at
        privacy@mylopaws.com. We aim to acknowledge requests promptly and resolve them within the timelines
        required by law. If unresolved, you may escalate to the Data Protection Board of India.
      </p>

      <h2>9. Children</h2>
      <p>
        The Platform is intended for adults (18+). We do not knowingly collect data from children. Where processing
        a child&apos;s or a person with disability&apos;s data is involved, we require verifiable consent from a parent or
        lawful guardian.
      </p>

      <h2>10. Third-party services</h2>
      <p>
        Google, Razorpay, and Supabase have their own privacy policies governing their processing. We encourage you
        to review them. Links or integrations to third-party sites are outside our control.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. Material changes will be notified through the Platform, and the
        &quot;Last updated&quot; date above will change.
      </p>

      <h2>12. Contact</h2>
      <p>
        Mylopaws · Bengaluru, India · support@mylopaws.com · Grievance Officer: privacy@mylopaws.com · WhatsApp +91 98874 45671.
      </p>
    </LegalShell>
  );
}
