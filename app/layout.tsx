import type { Metadata, Viewport } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';
import { mediaFor } from '@/lib/media';
import TabBar from '@/components/TabBar';
import AnalyticsClickTracker from '@/components/AnalyticsClickTracker';

const LOGO = mediaFor('brandLogo');
// GA4 Measurement ID. Public (non-secret) value, so a literal default keeps analytics working in
// production without any env setup; NEXT_PUBLIC_GA_ID can override per-environment if needed.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-GTTJWW777L';

export const metadata: Metadata = {
  title: 'Mylopaws — Pet Travel & Dermacare, Bengaluru',
  description: 'Pet-friendly cabs with live tracking and 12 specialised skin & coat therapies. Book in minutes.',
  metadataBase: new URL('https://www.mylopaws.app'),
  icons: { icon: LOGO, shortcut: LOGO, apple: LOGO },
  openGraph: {
    title: 'Mylopaws 🐾',
    description: 'Pet travel & dermacare, made effortless.',
    url: 'https://www.mylopaws.app',
    images: [{ url: LOGO, alt: 'Mylopaws' }],
  },
};
// viewportFit:'cover' is REQUIRED for env(safe-area-inset-*) to resolve to real values;
// without it those insets are 0 and headers underlap the notch / browser chrome.
// interactiveWidget:'resizes-content' makes the on-screen keyboard SHRINK the layout viewport
// (Android Chrome defaults to 'resizes-visual', which overlays the keyboard without resizing —
// that is what pushes fixed-bottom CTAs, `100dvh`/`100vh` panels and the "Save" button behind
// the keyboard). With 'resizes-content', dvh and fixed bottom bars stay above the keyboard.
export const viewport: Viewport = {
  themeColor: '#691A47', width: 'device-width', initialScale: 1,
  viewportFit: 'cover', interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        {/* CHANGE 6: warm the TCP/TLS handshake to Razorpay checkout so the sheet opens faster. */}
        <link rel="preconnect" href="https://checkout.razorpay.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
      </head>
      {/*
        TabBar (CHANGE 4) is mounted here at the layout root — a sibling of {children}, OUTSIDE the
        `.mp-page` route-transition template — so its `position: fixed` always resolves against the
        viewport and it never scrolls away. It self-hides on routes that shouldn't show it.
      */}
      <body className="font-sans text-ink antialiased pb-16 sm:pb-0">
        {children}
        <TabBar />
        {/* GA4: enhanced measurement (page_view on SPA route changes, scroll, outbound, forms,
            downloads) + AnalyticsClickTracker for a custom `interaction` event on every click. */}
        <AnalyticsClickTracker />
      </body>
      <GoogleAnalytics gaId={GA_ID} />
    </html>
  );
}
