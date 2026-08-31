import type { Metadata } from 'next';
import { getDict } from '../../../lib/i18n';
import { alternatesFor, openGraphFor } from '../../../lib/seo';
import { AssistantView } from '../../../components/views/AssistantView';

const LANG = 'pt';
const PATH = '/tailor-assistant';

export function generateMetadata(): Metadata {
  const a = getDict(LANG).assistantPage;
  const meta = { title: a.metaTitle, description: a.metaDescription };
  return {
    ...meta,
    alternates: alternatesFor(PATH, LANG),
    openGraph: openGraphFor(PATH, LANG, meta),
    twitter: { card: 'summary_large_image', ...meta },
  };
}

export default function Page() {
  return <AssistantView lang={LANG} />;
}
