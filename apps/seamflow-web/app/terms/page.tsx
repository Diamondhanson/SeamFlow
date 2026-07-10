import type { Metadata } from 'next';
import { getDict, resolveLang } from '../../lib/i18n';
import { terms } from '../../lib/legal';
import { LegalShell } from '../../components/LegalShell';

interface PageProps {
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const lang = resolveLang((await searchParams).lang);
  return {
    title: `${getDict(lang).legal.termsTitle} | SeamFlow`,
    alternates: { canonical: '/terms' },
  };
}

export default async function TermsPage({ searchParams }: PageProps) {
  const lang = resolveLang((await searchParams).lang);
  return <LegalShell lang={lang} title={getDict(lang).legal.termsTitle} doc={terms[lang]} />;
}
