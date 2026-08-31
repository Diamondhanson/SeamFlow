// Root layout for every prefixed language (/fr, /pt, /es, /sw …).
//
// This is where `lang` and `dir` finally become per-route and static. One tree
// serves every prefixed language, so adding one costs a code in LANGS and a
// block of copy — no new route files.
//
// NOTE: `dynamicParams` is deliberately NOT set here. The flag is route-wide
// rather than per-segment, so setting it on this layout would make
// /<lang>/t/<slug> — every tailor's catalogue — 404 for any slug not known at
// build time. It lives on the seven static leaf pages instead.
import { notFound } from 'next/navigation';
import { RootHtml } from '../../components/RootHtml';
import { siteMetadata } from '../../lib/site-metadata';
import { LANGS, DEFAULT_LANG, type Lang } from '../../lib/i18n';

export const metadata = siteMetadata;

export function generateStaticParams() {
  return LANGS.filter((l) => l !== DEFAULT_LANG).map((lang) => ({ lang }));
}

export default async function LanguageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  // English is unprefixed, so /en is not a route we publish — and an unknown
  // code must not render English content under <html lang="zz">.
  if (lang === DEFAULT_LANG || !LANGS.includes(lang as Lang)) notFound();
  return <RootHtml lang={lang as Lang}>{children}</RootHtml>;
}
