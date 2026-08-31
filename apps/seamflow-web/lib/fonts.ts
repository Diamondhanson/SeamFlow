// ============================================================================
// The Atelier type system, self-hosted by next/font.
//
//   Fraunces (serif)  → display / headlines, the craft signal
//   Inter (sans)      → body, labels, UI
//   JetBrains Mono    → measurement values (tabular figures)
//
// Lifted out of app/layout.tsx because there is no longer ONE root layout: the
// language segment sits above it, so `(en)`, `[lang]` and `(share)` each render
// their own <html>. They must all apply the same font variables, from the same
// font instances — declaring them per-layout would ask next/font to emit three
// separate copies of every face.
// ============================================================================

import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';

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

/** Every font variable, for the <html> className of each root layout. */
export const fontVariables = `${fraunces.variable} ${inter.variable} ${jetbrains.variable}`;
