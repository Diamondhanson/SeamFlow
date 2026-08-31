import type { Metadata } from 'next';
import { getDict } from '../../../lib/i18n';
import { alternatesFor } from '../../../lib/seo';
import { privacy } from '../../../lib/legal';
import { LegalShell } from '../../../components/LegalShell';

const LANG = 'es';

export function generateMetadata(): Metadata {
  return {
    title: `${getDict(LANG).legal.privacyTitle} | SeamFlow`,
    alternates: alternatesFor('/privacy', LANG),
  };
}

export default function Page() {
  return (
    <LegalShell lang={LANG} title={getDict(LANG).legal.privacyTitle} doc={privacy[LANG]} />
  );
}
