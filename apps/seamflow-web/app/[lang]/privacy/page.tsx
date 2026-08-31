import type { Metadata } from 'next';
import { getDict, type Lang } from '../../../lib/i18n';
import { alternatesFor } from '../../../lib/seo';
import { privacy } from '../../../lib/legal';
import { LegalShell } from '../../../components/LegalShell';

interface Props {
  params: Promise<{ lang: string }>;
}

// Only the languages in LANGS are built; /zz/... 404s rather than rendering
// English under a foreign lang attribute. Deliberately NOT on the layout —
// the flag is route-wide, so there it would also 404 every /<lang>/t/<slug>.
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const LANG = (await params).lang as Lang;
  return {
    title: `${getDict(LANG).legal.privacyTitle} | SeamFlow`,
    alternates: alternatesFor('/privacy', LANG),
  };
}

export default async function Page({ params }: Props) {
  const LANG = (await params).lang as Lang;
  return (
    <LegalShell lang={LANG} title={getDict(LANG).legal.privacyTitle} doc={privacy[LANG]} />
  );
}
