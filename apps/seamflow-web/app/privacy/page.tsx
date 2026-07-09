import type { Metadata } from 'next';
import { getDict, resolveLang } from '../../lib/i18n';
import { privacy } from '../../lib/legal';
import { LegalShell } from '../../components/LegalShell';

interface PageProps {
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const lang = resolveLang((await searchParams).lang);
  return {
    title: `${getDict(lang).legal.privacyTitle} — SeamFlow`,
    alternates: { canonical: '/privacy' },
  };
}

export default async function PrivacyPage({ searchParams }: PageProps) {
  const lang = resolveLang((await searchParams).lang);
  return <LegalShell lang={lang} title={getDict(lang).legal.privacyTitle} doc={privacy[lang]} />;
}
