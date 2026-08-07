// ============================================================================
// /alternatives/tailor-assist — the comparison page.
//
// This is the legitimate way to meet searchers looking for "tailor assist
// alternative": a page that genuinely helps them decide, rather than one that
// borrows a competitor's brand name for traffic. Three rules hold it together:
//
//   1. Disclose the author. The reader knows we're one of the two sides.
//   2. Date it. Both products ship; an undated comparison is a lie in waiting.
//   3. Publish the section where we lose. `theirs` is not decoration — if it
//      ever goes empty, delete this page rather than pretend.
// ============================================================================

import Link from 'next/link';
import type { Lang } from '../../lib/i18n';
import { getDict, withLang, COMPARISON_UPDATED, SITE } from '../../lib/i18n';
import { Nav } from '../Nav';
import { Footer } from '../Footer';
import { StoreBadges } from '../StoreBadges';
import { Icon } from '../icons';
import { BreadcrumbLd, OrganizationLd, SoftwareApplicationLd } from '../JsonLd';

/** "August 2026" / "août 2026" from the YYYY-MM constant. */
function formatMonth(ym: string, lang: Lang): string {
  const [y, m] = ym.split('-').map(Number);
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function AlternativesView({ lang }: { lang: Lang }) {
  const d = getDict(lang);
  const a = d.alternativesPage;
  const year = new Date().getFullYear();

  return (
    <div className="marketing min-h-screen" lang={lang}>
      <OrganizationLd />
      <SoftwareApplicationLd d={d} lang={lang} />
      <BreadcrumbLd
        lang={lang}
        items={[
          { name: SITE.name, path: '/' },
          { name: a.eyebrow, path: '/alternatives/tailor-assist' },
        ]}
      />
      <Nav d={d} lang={lang} onHome={false} />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-5 pb-8 pt-14 text-center sm:pt-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-surface/70 px-3 py-1 text-xs font-medium text-brand-muted">
            <Icon name="check" className="h-3.5 w-3.5 text-brand-primary" />
            {a.eyebrow}
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-brand-ink sm:text-5xl">
            {a.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-brand-muted">
            {a.subtitle}
          </p>
        </section>

        {/* Disclosure — deliberately near the top, not buried in a footnote. */}
        <section className="mx-auto max-w-3xl px-5 pb-4">
          <div className="rounded-3xl border border-brand-accent/30 bg-brand-accent/10 p-6 sm:p-7">
            <h2 className="font-display text-base font-semibold text-brand-ink">
              {a.disclosureTitle}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-brand-ink/75">
              {a.disclosureBody}
            </p>
            <p className="mt-3 text-sm text-brand-muted">
              {a.updatedLabel.replace('{date}', formatMonth(COMPARISON_UPDATED, lang))}
            </p>
          </div>
        </section>

        {/* Where SeamFlow is different */}
        <section className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
          <h2 className="font-display text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">
            {a.strengthsHeading}
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-brand-muted">
            {a.strengthsBody}
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {a.strengths.map((s) => (
              <div
                key={s.key}
                className="rounded-3xl border border-brand-hairline bg-brand-surface/60 p-6"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                  <Icon name={s.key} className="h-6 w-6" />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-brand-ink">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Where they win — same visual weight as the section above, on purpose */}
        <section className="bg-brand-surface/40 py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-5">
            <h2 className="font-display text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">
              {a.theirsHeading}
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-brand-muted">
              {a.theirsBody}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {a.theirs.map((t) => (
                <div
                  key={t.title}
                  className="rounded-3xl border border-brand-border bg-brand-bg p-6"
                >
                  <h3 className="font-display text-base font-semibold text-brand-ink">
                    {t.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-brand-muted">{t.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Shared ground */}
        <section className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
          <h2 className="font-display text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">
            {a.sharedHeading}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-brand-muted">{a.sharedBody}</p>
          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {a.shared.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 rounded-2xl border border-brand-hairline bg-brand-surface/60 px-4 py-3 text-[15px] leading-snug text-brand-ink"
              >
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-success" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section id="get-app" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-20">
          <div className="relative overflow-hidden rounded-5xl bg-gradient-to-br from-brand-primary via-brand-primaryDeep to-[#41109B] p-10 text-center text-white shadow-glow sm:p-14">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-16 h-56 w-56 transform-gpu rounded-full bg-brand-lavender/30 blur-3xl"
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold leading-tight sm:text-4xl">
                {a.ctaTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">{a.ctaBody}</p>
              <div className="mt-8 flex justify-center">
                <StoreBadges d={d} />
              </div>
              <Link
                href={withLang('/#features', lang)}
                className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-white/85 underline underline-offset-4 transition hover:text-white"
              >
                {a.backToFeatures}
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer d={d} lang={lang} year={year} onHome={false} />
    </div>
  );
}
