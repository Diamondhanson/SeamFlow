// ============================================================================
// Structured data (schema.org JSON-LD).
//
// This is what lets search engines — and the AI answer engines that now sit in
// front of them — state plainly *what SeamFlow is* rather than inferring it
// from prose. Three graphs:
//
//   Organization      → the brand entity behind the site
//   SoftwareApplication → the product: category, platforms, price, features
//   FAQPage           → the Q&A pairs, so answers can be lifted directly
//
// Note on FAQPage: Google restricted the *visual* FAQ rich result to
// government and health sites in 2023, so don't expect accordions in the SERP.
// The markup still earns its place — it's a machine-readable statement of what
// the product does, which is exactly what AI Overviews and assistants consume.
//
// Rendered server-side as a plain <script>. `JSON.stringify` output is escaped
// for the one character that can break out of a script element.
// ============================================================================

import type { Dict, Lang } from '../lib/i18n';
import { SITE, withLang } from '../lib/i18n';

/** Escape the only sequence that can terminate a <script> block early. */
function serialize(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function Ld({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Content is our own compile-time copy, never user input.
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}

/** Brand entity — lets the site claim a consistent identity across pages. */
export function OrganizationLd() {
  return (
    <Ld
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${SITE.url}/#organization`,
        name: SITE.name,
        url: SITE.url,
        logo: `${SITE.url}/opengraph-image`,
        email: SITE.email,
        telephone: SITE.phone,
        description:
          'SeamFlow builds an AI tailor assistant and workshop management app for tailors and fashion designers.',
      }}
    />
  );
}

/**
 * The product itself. `alternateName` is where the category phrase belongs —
 * it's a legitimate "also known as", not a keyword dumped into body copy.
 */
export function SoftwareApplicationLd({ d, lang }: { d: Dict; lang: Lang }) {
  return (
    <Ld
      data={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        '@id': `${SITE.url}/#app`,
        name: SITE.name,
        alternateName: [
          'SeamFlow Tailor Assistant',
          lang === 'fr' ? 'Assistant tailleur SeamFlow' : 'SeamFlow AI tailor assistant',
        ],
        applicationCategory: 'BusinessApplication',
        applicationSubCategory:
          lang === 'fr' ? 'Assistant tailleur' : 'Tailor assistant',
        operatingSystem: 'Android, Web',
        url: `${SITE.url}${withLang('/', lang)}`,
        inLanguage: ['en', 'fr'],
        description: d.seo.description,
        publisher: { '@id': `${SITE.url}/#organization` },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'XAF',
          availability: 'https://schema.org/InStock',
        },
        featureList: d.features.items.map((f) => f.title),
      }}
    />
  );
}

/** Q&A pairs, machine-readable. Answers are plain text — no markup. */
export function FaqLd({ d }: { d: Dict }) {
  return (
    <Ld
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: d.faq.items.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      }}
    />
  );
}

/**
 * Breadcrumb for sub-pages, so the SERP shows the path rather than a raw URL.
 * `path` is language-neutral (`/tailor-assistant`); `lang` decides whether the
 * emitted URL is the English or the `/fr` one. Pointing a French page's
 * breadcrumb at English URLs would contradict its own hreflang.
 */
export function BreadcrumbLd({
  items,
  lang,
}: {
  items: { name: string; path: string }[];
  lang: Lang;
}) {
  return (
    <Ld
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((it, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: it.name,
          item: `${SITE.url}${withLang(it.path, lang)}`,
        })),
      }}
    />
  );
}
