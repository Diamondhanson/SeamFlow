// ============================================================================
// Per-page SEO metadata helpers.
//
// Every indexable page needs three things stated consistently, and getting any
// one of them wrong quietly costs the other language its ranking:
//
//   canonical  — which URL is the real one for THIS page (never the other
//                language's; a cross-language canonical tells Google to drop
//                the French version entirely)
//   hreflang   — which URL serves which language, declared reciprocally
//   x-default  — where to send a searcher whose language we don't publish
//
// `alternatesFor('/privacy', 'fr')` is the single place that logic lives.
// ============================================================================

import type { Lang } from './i18n';
import { withLang, LANGS, SITE, OG_LOCALE } from './i18n';

/** Language-neutral paths that exist in both English and French. */
export const LOCALIZED_ROUTES = [
  '/',
  '/tailor-assistant',
  '/alternatives/tailor-assist',
  '/privacy',
  '/terms',
  '/support',
] as const;

/**
 * canonical + hreflang for one page in one language.
 *
 * `path` is the language-neutral route (`/privacy`), `lang` the language this
 * particular page renders in. The canonical points at *this* language's URL —
 * both versions are real pages, each canonical to itself.
 */
export function alternatesFor(path: string, lang: Lang) {
  return {
    canonical: withLang(path, lang),
    // Built from LANGS so a new language is declared reciprocally everywhere
    // the moment it is added. A translation Google cannot see the hreflang for
    // competes with its own siblings instead of being served to the right
    // reader.
    languages: {
      ...Object.fromEntries(LANGS.map((l) => [l, withLang(path, l)])),
      // Unmatched languages get English.
      'x-default': withLang(path, 'en'),
    },
  };
}

/** OpenGraph locale + absolute URL for one page in one language. */
export function openGraphFor(
  path: string,
  lang: Lang,
  { title, description }: { title: string; description: string },
) {
  return {
    title,
    description,
    type: 'website' as const,
    url: `${SITE.url}${withLang(path, lang)}`,
    siteName: SITE.name,
    locale: OG_LOCALE[lang],
    alternateLocale: LANGS.filter((l) => l !== lang).map((l) => OG_LOCALE[l]),
    // Stated explicitly rather than relying on file-based metadata inheritance.
    // Next only folds app/opengraph-image.tsx into a page that does NOT set its
    // own `openGraph` — and every page using this helper does. That is why the
    // prefixed languages have been shipping share cards with no image since the
    // day they launched, while /privacy (which sets no openGraph) was fine.
    images: [{ url: `${SITE.url}/opengraph-image`, width: 1200, height: 630, alt: SITE.name }],
  };
}
