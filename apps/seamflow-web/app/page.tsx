import type { Metadata } from 'next';
import { getDict, resolveLang, SITE } from '../lib/i18n';
import { Nav } from '../components/Nav';
import { Hero } from '../components/Hero';
import { Problem, Features, Steps, Vision, Gallery, Cta } from '../components/Sections';
import { Faq } from '../components/Faq';
import { Footer } from '../components/Footer';

interface PageProps {
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const lang = resolveLang((await searchParams).lang);
  const d = getDict(lang);
  const title = `${SITE.name} — ${d.hero.title}`;
  return {
    title,
    description: d.hero.subtitle,
    alternates: { canonical: '/' },
    openGraph: { title, description: d.hero.subtitle, type: 'website', url: SITE.url },
  };
}

export default async function LandingPage({ searchParams }: PageProps) {
  const lang = resolveLang((await searchParams).lang);
  const d = getDict(lang);
  const year = new Date().getFullYear();

  return (
    <div className="marketing min-h-screen">
      <Nav d={d} lang={lang} />
      <main>
        <Hero d={d} />
        <Problem d={d} />
        <Features d={d} />
        <Steps d={d} />
        <Vision d={d} />
        <Gallery d={d} />
        <Faq d={d} lang={lang} />
        <Cta d={d} />
      </main>
      <Footer d={d} lang={lang} year={year} />
    </div>
  );
}
