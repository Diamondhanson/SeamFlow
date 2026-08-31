// ============================================================================
// Site-wide metadata defaults.
//
// Individual pages override title/description/keywords in their own
// generateMetadata (which is also where the per-language canonical and hreflang
// alternates live) — these are the fallbacks for anything that doesn't, and the
// values Next merges into every page.
//
// Lives here rather than in a layout because there are now three root layouts
// (see lib/fonts.ts), and they must not drift apart.
// ============================================================================

import type { Metadata } from 'next';

export const siteMetadata: Metadata = {
  metadataBase: new URL('https://www.seamflowtech.com'),
  title: {
    default: 'SeamFlow: the AI tailor assistant for measurements, orders & invoices',
    template: '%s',
  },
  description:
    'SeamFlow is a tailor assistant app for tailors and fashion designers. Scan measurements from paper, track orders, send invoices, and ask an AI assistant about your business. Multilingual, offline-first, free in early access.',
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
