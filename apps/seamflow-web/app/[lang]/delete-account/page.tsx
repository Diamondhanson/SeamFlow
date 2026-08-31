import type { Metadata } from 'next';
import { getDict, type Lang } from '../../../lib/i18n';
import { alternatesFor } from '../../../lib/seo';
import { DeleteAccountView } from '../../../components/views/DeleteAccountView';

interface Props {
  params: Promise<{ lang: string }>;
}

// Only the languages in LANGS are built; /zz/... 404s rather than rendering
// English under a foreign lang attribute. Deliberately NOT on the layout —
// the flag is route-wide, so there it would also 404 every /<lang>/t/<slug>.
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const LANG = (await params).lang as Lang;
  const d = getDict(LANG).deleteAccount;
  return {
    title: `${d.metaTitle} | SeamFlow`,
    description: d.metaDescription,
    alternates: alternatesFor('/delete-account', LANG),
  };
}

export default async function Page({ params }: Props) {
  const LANG = (await params).lang as Lang;
  return <DeleteAccountView lang={LANG} />;
}
