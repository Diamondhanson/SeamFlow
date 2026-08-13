import type { Metadata } from 'next';
import { getDict } from '../../../lib/i18n';
import { alternatesFor } from '../../../lib/seo';
import { DeleteAccountView } from '../../../components/views/DeleteAccountView';

const LANG = 'fr';

export function generateMetadata(): Metadata {
  const d = getDict(LANG).deleteAccount;
  return {
    title: `${d.metaTitle} | SeamFlow`,
    description: d.metaDescription,
    alternates: alternatesFor('/delete-account', LANG),
  };
}

export default function Page() {
  return <DeleteAccountView lang={LANG} />;
}
