import type { Metadata } from 'next';
import type { Lang } from '../../lib/i18n';
import { SITE, withLang, LANGS, OG_LOCALE } from '../../lib/i18n';
import { getCatalogueCopy } from '../../lib/catalogue';
import { loadCatalogue } from '../../lib/catalogue-data';
import { CatalogueView } from './CatalogueView';

/**
 * The EN and FR routes are two files so each gets its own canonical and its
 * own `<html lang>` — but they are the same page, so the body and the metadata
 * both live here and take `lang` as an argument.
 */
export async function CataloguePage({
  slug,
  lang,
  designId,
}: {
  slug: string;
  lang: Lang;
  /** `?d=<id>` — a link to one design rather than the whole wall. */
  designId?: string;
}) {
  const payload = await loadCatalogue(slug);
  if (!payload) return <CatalogueNotFound lang={lang} />;

  return (
    <>
      <CatalogueJsonLd slug={slug} lang={lang} payload={payload} />
      <CatalogueView
        lang={lang}
        tailor={payload.tailor}
        posts={payload.posts}
        pageUrl={`${SITE.url}${withLang(`/t/${slug}`, lang)}`}
        initialDesignId={designId}
      />
    </>
  );
}

/**
 * Title, description and the OpenGraph block WhatsApp reads.
 *
 * The OG image is NOT declared here — `opengraph-image.tsx` in the same route
 * segment is picked up by convention, and naming it again in this object would
 * override the generated one with a broken relative URL.
 */
export async function catalogueMetadata(slug: string, lang: Lang): Promise<Metadata> {
  const c = getCatalogueCopy(lang);
  const payload = await loadCatalogue(slug).catch(() => null);

  if (!payload) {
    return {
      title: `${c.notFoundTitle} | ${SITE.name}`,
      description: c.notFoundBody,
      // A missing shop must not be indexed — otherwise a mistyped link that
      // someone shared once lives on in search results as a dead page.
      robots: { index: false, follow: false },
    };
  }

  const { tailor, posts } = payload;
  const path = `/t/${slug}`;
  const title = c.metaTitle(tailor.businessName);
  const description = c.metaDescription(tailor.businessName, posts.length, tailor.city);

  return {
    title: `${title} | ${SITE.name}`,
    description,
    alternates: {
      canonical: `${SITE.url}${withLang(path, lang)}`,
      languages: {
        ...Object.fromEntries(
          LANGS.map((l) => [l, `${SITE.url}${withLang(path, l)}`]),
        ),
        'x-default': `${SITE.url}${withLang(path, 'en')}`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'profile',
      url: `${SITE.url}${withLang(path, lang)}`,
      siteName: SITE.name,
      locale: OG_LOCALE[lang],
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

/**
 * Structured data so the page can be understood as a shop rather than an
 * article. `sameAs` is deliberately absent — we hold no verified profile links
 * for a tailor, and inventing them would be a false claim in machine-readable
 * form.
 */
function CatalogueJsonLd({
  slug,
  lang,
  payload,
}: {
  slug: string;
  lang: Lang;
  payload: NonNullable<Awaited<ReturnType<typeof loadCatalogue>>>;
}) {
  const { tailor, posts } = payload;
  const json = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: tailor.businessName,
    url: `${SITE.url}${withLang(`/t/${slug}`, lang)}`,
    ...(tailor.avatarUrl ? { image: tailor.avatarUrl } : {}),
    ...(tailor.bio ? { description: tailor.bio } : {}),
    ...(tailor.city ? { address: { '@type': 'PostalAddress', addressLocality: tailor.city } } : {}),
    ...(tailor.whatsapp ? { telephone: tailor.whatsapp } : {}),
    ...(posts.length
      ? {
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: getCatalogueCopy(lang).worksTitle,
            itemListElement: posts.slice(0, 20).map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'Product',
                name: p.caption ?? p.garmentType ?? tailor.businessName,
                image: p.imageUrl,
              },
            })),
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

/**
 * Shown for an unknown or retired slug.
 *
 * A real page rather than `notFound()`, because the commonest way to land here
 * is a link typed off a photograph with one character wrong — and Next's
 * generic 404 gives that person nothing to do next.
 */
function CatalogueNotFound({ lang }: { lang: Lang }) {
  const c = getCatalogueCopy(lang);
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 h-px w-12 bg-accent/70" />
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
        {c.notFoundTitle}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">{c.notFoundBody}</p>
      <a
        href={withLang('/', lang)}
        className="mt-8 inline-flex items-center rounded-full border border-border/70 bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surfaceElevated"
      >
        {SITE.name}
      </a>
    </main>
  );
}
