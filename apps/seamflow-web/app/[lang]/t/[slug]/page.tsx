import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LANGS, DEFAULT_LANG, type Lang } from '../../../../lib/i18n';
import { CataloguePage, catalogueMetadata } from '../../../../components/views/CataloguePage';

interface Props {
  params: Promise<{ lang: string; slug: string }>;
  /** `?d=<id>` opens one design directly — see CatalogueGrid's URL handling. */
  searchParams: Promise<{ d?: string | string[] }>;
}

export const revalidate = 300;

// NOTE: no `dynamicParams = false` here, unlike the seven static pages. Slugs
// are minted by tailors at runtime and are not known at build time, so this
// route must stay open. The language still is not: resolveLang below rejects
// anything outside LANGS rather than serving English under a foreign `lang`.
function assertLang(lang: string): Lang {
  if (lang === DEFAULT_LANG || !LANGS.includes(lang as Lang)) notFound();
  return lang as Lang;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  return catalogueMetadata(slug, assertLang(lang));
}

export default async function Page({ params, searchParams }: Props) {
  const { lang, slug } = await params;
  const { d } = await searchParams;
  return (
    <CataloguePage
      slug={slug}
      lang={assertLang(lang)}
      designId={Array.isArray(d) ? d[0] : d}
    />
  );
}
