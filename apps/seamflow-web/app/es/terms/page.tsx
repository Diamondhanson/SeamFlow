import type { Metadata } from 'next';
import { getDict } from '../../../lib/i18n';
import { alternatesFor } from '../../../lib/seo';
import { terms } from '../../../lib/legal';
import { LegalShell } from '../../../components/LegalShell';

const LANG = 'es';

export function generateMetadata(): Metadata {
  return {
    title: `${getDict(LANG).legal.termsTitle} | SeamFlow`,
    alternates: alternatesFor('/terms', LANG),
  };
}

export default function Page() {
  return (
    <LegalShell lang={LANG} title={getDict(LANG).legal.termsTitle} doc={terms[LANG]} />
  );
}
