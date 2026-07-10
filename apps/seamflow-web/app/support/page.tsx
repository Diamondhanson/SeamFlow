import type { Metadata } from 'next';
import Link from 'next/link';
import { getDict, resolveLang, withLang, SITE } from '../../lib/i18n';
import { Icon } from '../../components/icons';
import { LangToggle } from '../../components/LangToggle';
import { Footer } from '../../components/Footer';

interface PageProps {
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const lang = resolveLang((await searchParams).lang);
  return {
    title: `${getDict(lang).legal.supportTitle} | SeamFlow`,
    alternates: { canonical: '/support' },
  };
}

export default async function SupportPage({ searchParams }: PageProps) {
  const lang = resolveLang((await searchParams).lang);
  const d = getDict(lang);
  const year = new Date().getFullYear();

  return (
    <div className="marketing min-h-screen">
      <header className="sticky top-0 z-50 border-b border-brand-hairline bg-brand-bg/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <Link href={withLang('/', lang)} className="flex items-center gap-2 text-brand-ink">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-primary to-brand-lavender text-white">
              <Icon name="logo" className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-bold">SeamFlow</span>
          </Link>
          <LangToggle lang={lang} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
        <Link
          href={withLang('/', lang)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted transition hover:text-brand-ink"
        >
          <Icon name="arrow" className="h-4 w-4 rotate-180" />
          {d.legal.backToHome}
        </Link>

        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">
          {d.legal.supportTitle}
        </h1>
        <p className="mt-3 text-lg text-brand-muted">{d.support.intro}</p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <div className="rounded-3xl border border-brand-hairline bg-brand-surface/60 p-7">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-primary/10 text-brand-primary">
              <Icon name="share" className="h-6 w-6" />
            </span>
            <h2 className="mt-5 font-display text-lg font-semibold text-brand-ink">
              {d.support.emailHeading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-muted">{d.support.emailBody}</p>
            <a
              href={`mailto:${SITE.email}`}
              className="mt-4 inline-flex rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-primaryDeep"
            >
              {SITE.email}
            </a>
          </div>

          <div className="rounded-3xl border border-brand-hairline bg-brand-surface/60 p-7">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-accent/10 text-brand-accent">
              <Icon name="spark" className="h-6 w-6" />
            </span>
            <h2 className="mt-5 font-display text-lg font-semibold text-brand-ink">
              {d.support.faqHeading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-muted">{d.support.faqBody}</p>
            <Link
              href={withLang('/', lang) + '#faq'}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-surface px-5 py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-bg"
            >
              {d.support.faqLink}
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer d={d} lang={lang} year={year} />
    </div>
  );
}
