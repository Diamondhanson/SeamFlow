import Link from 'next/link';
import type { Dict, Lang } from '../lib/i18n';
import { getDict, withLang } from '../lib/i18n';
import type { LegalDoc } from '../lib/legal';
import { LEGAL_UPDATED } from '../lib/legal';
import { Icon } from './icons';
import { LangToggle } from './LangToggle';
import { Footer } from './Footer';

function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
    dateStyle: 'long',
  }).format(new Date(iso + 'T00:00:00'));
}

export function LegalShell({
  lang,
  title,
  doc,
}: {
  lang: Lang;
  title: string;
  doc: LegalDoc;
}) {
  const d: Dict = getDict(lang);
  const year = new Date().getFullYear();

  return (
    <div className="marketing min-h-screen">
      {/* Minimal header */}
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

      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <Link
          href={withLang('/', lang)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted transition hover:text-brand-ink"
        >
          <Icon name="arrow" className="h-4 w-4 rotate-180" />
          {d.legal.backToHome}
        </Link>

        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-brand-muted">
          {d.legal.lastUpdated}: {formatDate(LEGAL_UPDATED, lang)}
        </p>

        <div className="mt-4 rounded-2xl border border-brand-accent/30 bg-brand-accent/10 px-4 py-3 text-sm text-brand-ink/80">
          {d.legal.draftNotice}
        </div>

        <p className="mt-8 text-[15px] leading-relaxed text-brand-muted">{doc.intro}</p>

        <div className="mt-8 space-y-8">
          {doc.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="font-display text-xl font-semibold text-brand-ink">{s.heading}</h2>
              <div className="mt-3 space-y-3">
                {s.paragraphs.map((p, i) => (
                  <p key={i} className="text-[15px] leading-relaxed text-brand-muted">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <Footer d={d} lang={lang} year={year} />
    </div>
  );
}
