import type { Metadata } from 'next';
import { getDict } from '../../../lib/i18n';
import { alternatesFor } from '../../../lib/seo';
import { SupportView } from '../../../components/views/SupportView';

const LANG = 'sw';

export function generateMetadata(): Metadata {
  const d = getDict(LANG);
  return {
    title: `${d.legal.supportTitle} | SeamFlow`,
    description: d.support.intro,
    alternates: alternatesFor('/support', LANG),
  };
}

export default function Page() {
  return <SupportView lang={LANG} />;
}
