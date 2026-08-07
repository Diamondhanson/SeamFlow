import type { Metadata } from 'next';
import { getDict } from '../../../../lib/i18n';
import { alternatesFor, openGraphFor } from '../../../../lib/seo';
import { AlternativesView } from '../../../../components/views/AlternativesView';

const LANG = 'fr';
const PATH = '/alternatives/tailor-assist';

export function generateMetadata(): Metadata {
  const a = getDict(LANG).alternativesPage;
  const meta = { title: a.metaTitle, description: a.metaDescription };
  return {
    ...meta,
    alternates: alternatesFor(PATH, LANG),
    openGraph: openGraphFor(PATH, LANG, meta),
    twitter: { card: 'summary_large_image', ...meta },
  };
}

export default function Page() {
  return <AlternativesView lang={LANG} />;
}
