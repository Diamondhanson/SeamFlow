import type { Metadata } from 'next';
import { getDict } from '../../lib/i18n';
import { alternatesFor, openGraphFor } from '../../lib/seo';
import { LandingView } from '../../components/views/LandingView';

const LANG = 'en';

export function generateMetadata(): Metadata {
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

export default function Page() {
  return <LandingView lang={LANG} />;
}
