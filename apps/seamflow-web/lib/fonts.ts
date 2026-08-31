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

import {
  Fraunces,
  IBM_Plex_Sans_Arabic,
  Inter,
  JetBrains_Mono,
  Noto_Kufi_Arabic,
} from 'next/font/google';

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

// ── Arabic ──────────────────────────────────────────────────────────────────
// None of the three faces above ships Arabic glyphs, and all are loaded with
// `subsets: ['latin']`, so Arabic would fall through to whatever the OS picks.
//
// These are wired into the Tailwind FALLBACK arrays rather than swapped in
// under `:lang(ar)`. Font fallback is resolved per character, so a mixed run —
// "SeamFlow" or "WhatsApp" inside an Arabic sentence — keeps the Latin word in
// Inter and renders the Arabic in Plex, with no conditional CSS anywhere.
//
// `preload: false` because the overwhelming majority of visitors read a Latin
// language: browsers only fetch a face once a character actually maps into it,
// so English pages never pay for these. Verified in the resource list.
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600'], // matches Inter's ladder exactly
  variable: '--font-body-ar',
  display: 'swap',
  preload: false,
});

// Kufi rather than a second naskh: Fraunces' job is textural contrast against
// Inter at large sizes, and a naskh display face beside Plex Sans Arabic would
// read as two slightly different naskhs rather than a deliberate pairing.
const kufiArabic = Noto_Kufi_Arabic({
  subsets: ['arabic'],
  weight: ['600', '700'],
  variable: '--font-display-ar',
  display: 'swap',
  preload: false,
});

/** Every font variable, for the <html> className of each root layout. */
export const fontVariables = [
  fraunces.variable,
  inter.variable,
  jetbrains.variable,
  plexArabic.variable,
  kufiArabic.variable,
].join(' ');
