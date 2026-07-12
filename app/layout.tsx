import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mylopaws — Pet Travel & Dermacare, Bengaluru',
  description: 'Pet-friendly cabs with live tracking and 12 specialised skin & coat therapies. Book in minutes.',
  metadataBase: new URL('https://www.mylopaws.app'),
  openGraph: { title: 'Mylopaws 🐾', description: 'Pet travel & dermacare, made effortless.', url: 'https://www.mylopaws.app' },
};
export const viewport: Viewport = { themeColor: '#691A47', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans text-ink antialiased pb-16 sm:pb-0">{children}</body>
    </html>
  );
}
