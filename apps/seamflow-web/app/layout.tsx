import type { Metadata } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

// The Atelier type system, self-hosted by next/font:
//   Fraunces (serif)      → display / headlines, the craft signal
//   Inter (sans)          → body, labels, UI
//   JetBrains Mono        → measurement values (tabular figures)
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['600', '700'],
  style: ['normal'],
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-mono',
  display: 'swap',
});

// Site-wide defaults. Individual pages override title/description/keywords in
// their own generateMetadata (which is also where the per-language canonical
// and hreflang alternates live) — these are the fallbacks for anything that
// doesn't, and the values Next merges into every page.
export const metadata: Metadata = {
  metadataBase: new URL('https://www.seamflowtech.com'),
  title: {
    default: 'SeamFlow — the AI tailor assistant for measurements, orders & invoices',
    template: '%s',
  },
  description:
    'SeamFlow is a tailor assistant app for tailors and fashion designers. Scan measurements from paper, track orders, send invoices, and ask an AI assistant about your business. Bilingual, offline-first, free in early access.',
  applicationName: 'SeamFlow',
  authors: [{ name: 'SeamFlow' }],
  creator: 'SeamFlow',
  publisher: 'SeamFlow',
  category: 'business',
  keywords: [
    'tailor assistant',
    'tailor assistant app',
    'AI tailor assistant',
    'tailoring assistant',
    'assistant for tailors',
    'assistant tailleur',
    'tailor app',
    'tailoring software',
    'measurement app for tailors',
    'tailor order management',
    'tailoring business app',
    'fashion designer app',
    'measurement scanner',
    'tailor invoicing',
    'atelier management',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
