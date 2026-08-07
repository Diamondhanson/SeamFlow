// ============================================================================
// /tailor-assistant (and /fr/tailor-assistant) — the dedicated page for the
// category phrase.
//
// Why this exists: an exact-match URL slug carrying real, specific content is
// the strongest single asset for ranking on a phrase. The homepage sells the
// whole product; this page answers one question — "is there an AI assistant
// for tailors?" — thoroughly enough to be the best result for it.
//
// It is not a doorway page: everything here describes a feature that ships.
// ============================================================================

import Link from 'next/link';
import type { Lang } from '../../lib/i18n';
import { getDict, withLang, SITE } from '../../lib/i18n';
import { Nav } from '../Nav';
import { Footer } from '../Footer';
import { StoreBadges } from '../StoreBadges';
import { Icon } from '../icons';
import { BreadcrumbLd, OrganizationLd, SoftwareApplicationLd } from '../JsonLd';

/** Rounded card listing example prompts, styled as chat bubbles. */
function PromptList({ items, tone }: { items: readonly string[]; tone: 'ask' | 'do' }) {
  const cls =
    tone === 'ask'
      ? 'border-brand-hairline bg-brand-surface/60 text-brand-ink'
      : 'border-brand-primary/20 bg-brand-primary/[0.07] text-brand-ink';
  return (
    <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
      {items.map((it) => (
        <li
          key={it}
          className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-[15px] leading-snug ${cls}`}
        >
          <Icon
            name={tone === 'ask' ? 'assistant' : 'check'}
            className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary"
          />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function AssistantView({ lang }: { lang: Lang }) {
  const d = getDict(lang);
  const a = d.assistantPage;
  const year = new Date().getFullYear();

  return (
    <div className="marketing min-h-screen" lang={lang}>
      <OrganizationLd />
      <SoftwareApplicationLd d={d} lang={lang} />
      <BreadcrumbLd
        lang={lang}
        items={[
          { name: SITE.name, path: '/' },
          { name: d.nav.assistant, path: '/tailor-assistant' },
        ]}
      />
      <Nav d={d} lang={lang} onHome={false} />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-5 pb-10 pt-14 text-center sm:pt-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-surface/70 px-3 py-1 text-xs font-medium text-brand-muted">
            <Icon name="spark" className="h-3.5 w-3.5 text-brand-primary" />
            {a.eyebrow}
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-brand-ink sm:text-5xl">
            {a.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-brand-muted">
            {a.subtitle}
          </p>
          <div className="mt-8 flex justify-center">
            <StoreBadges d={d} />
          </div>
        </section>

        {/* Ask it */}
        <section className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
          <h2 className="font-display text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">
            {a.askHeading}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-brand-muted">{a.askBody}</p>
          <PromptList items={a.askItems} tone="ask" />
        </section>

        {/* Tell it */}
        <section className="bg-brand-surface/40 py-12 sm:py-16">
          <div className="mx-auto max-w-4xl px-5">
            <h2 className="font-display text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">
              {a.doHeading}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-brand-muted">{a.doBody}</p>
            <PromptList items={a.doItems} tone="do" />
          </div>
        </section>

        {/* Pillars */}
        <section className="mx-auto max-w-5xl px-5 py-14 sm:py-20">
          <div className="grid gap-5 sm:grid-cols-2">
            {a.pillars.map((p) => (
              <div
                key={p.key}
                className="rounded-3xl border border-brand-hairline bg-brand-surface/60 p-6"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                  <Icon name={p.key} className="h-6 w-6" />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-brand-ink">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section id="get-app" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-20">
          <div className="relative overflow-hidden rounded-5xl bg-gradient-to-br from-brand-primary via-brand-primaryDeep to-[#41109B] p-10 text-center text-white shadow-glow sm:p-14">
            <div
              aria-hidden="true"
              className="absolute -left-16 -top-16 h-56 w-56 transform-gpu rounded-full bg-brand-lavender/30 blur-3xl"
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
