import type { Metadata, Viewport } from 'next';
import './globals.css';
import { mediaFor } from '@/lib/media';
import TabBar from '@/components/TabBar';

const LOGO = mediaFor('brandLogo');

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
export const viewport: Viewport = { themeColor: '#691A47', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

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
      <body className="font-sans text-ink antialiased pb-16 sm:pb-0">{children}<TabBar /></body>
    </html>
  );
}
