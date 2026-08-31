import type { Metadata } from 'next';
import { getDict, type Lang } from '../../lib/i18n';
import { alternatesFor, openGraphFor } from '../../lib/seo';
import { LandingView } from '../../components/views/LandingView';

interface Props {
  params: Promise<{ lang: string }>;
}

// Only the languages in LANGS are built; /zz/... 404s rather than rendering
// English under a foreign lang attribute. Deliberately NOT on the layout —
// the flag is route-wide, so there it would also 404 every /<lang>/t/<slug>.
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const LANG = (await params).lang as Lang;
  const d = getDict(LANG);
  const meta = { title: d.seo.title, description: d.seo.description };
  return {
    ...meta,
    keywords: d.seo.keywords,
    alternates: alternatesFor('/', LANG),
    openGraph: openGraphFor('/', LANG, meta),
    twitter: { card: 'summary_large_image', ...meta },
  };
}

export default async function Page({ params }: Props) {
  const LANG = (await params).lang as Lang;
  return <LandingView lang={LANG} />;
}
