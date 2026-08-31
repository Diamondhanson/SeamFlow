// ============================================================================
// The public "delete my account" page, shared by /delete-account and /fr/….
//
// This exists because Google Play requires an account-deletion route that
// works WITHOUT installing the app — for the person who already uninstalled,
// or lost the phone, and has no other way to reach us. Apple is satisfied by
// the in-app flow; this page is the other half.
//
// It is deliberately not a form. A form here would either delete an account on
// the strength of a typed email address — which is anyone's to type — or need
// its own confirmation-link machinery duplicating what the app already does
// safely. So the page explains precisely what happens, sends people who can
// still sign in to the two-tap route, and gives everyone else a mail link that
// reaches a human. Play's requirement is that the route exists and is
// discoverable, not that it be self-service.
// ============================================================================

import Link from 'next/link';
import type { Lang } from '../../lib/i18n';
import { getDict, withLang, SITE } from '../../lib/i18n';
import { Icon } from '../icons';
import { LangToggle } from '../LangToggle';
import { Wordmark } from '../Wordmark';
import { Footer } from '../Footer';

export function DeleteAccountView({ lang }: { lang: Lang }) {
  const d = getDict(lang);
  const t = d.deleteAccount;

  const subject = encodeURIComponent(t.mailSubject);
  const body = encodeURIComponent(t.mailBody);

  return (
    <div className="marketing min-h-screen" lang={lang}>
      <header className="sticky top-0 z-50 border-b border-brand-hairline bg-brand-bg/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <Link href={withLang('/', lang)} className="flex items-center gap-2 text-brand-ink">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-primary to-brand-lavender text-white">
              <Icon name="logo" className="h-4 w-4" />
            </span>
            <Wordmark className="h-4 w-auto" />
          </Link>
          <LangToggle lang={lang} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
        <Link
          href={withLang('/', lang)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted transition hover:text-brand-ink"
        >
          <Icon name="arrowBack" className="h-4 w-4" />
          {d.legal.backToHome}
        </Link>

        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">
          {t.title}
        </h1>
        <p className="mt-3 text-lg text-brand-muted">{t.intro}</p>

        {/* Fastest route first: most people reading this can still sign in. */}
        <section className="mt-10 rounded-3xl border border-brand-hairline bg-brand-surface/60 p-7">
          <h2 className="font-display text-lg font-semibold text-brand-ink">{t.inAppHeading}</h2>
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">{t.inAppBody}</p>
          <ol className="mt-4 list-decimal space-y-1.5 ps-5 text-sm text-brand-muted">
            <li>{t.inAppStep1}</li>
            <li>{t.inAppStep2}</li>
            <li>{t.inAppStep3}</li>
          </ol>
        </section>

        <section className="mt-5 rounded-3xl border border-brand-hairline bg-brand-surface/60 p-7">
          <h2 className="font-display text-lg font-semibold text-brand-ink">{t.emailHeading}</h2>
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">{t.emailBody}</p>
          <a
            href={`mailto:${SITE.email}?subject=${subject}&body=${body}`}
            className="mt-4 inline-flex rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-primaryDeep"
          >
            {t.emailCta}
          </a>
        </section>

        <h2 className="mt-12 font-display text-2xl font-semibold text-brand-ink">
          {t.whatHappensHeading}
        </h2>
        <p className="mt-2 text-brand-muted">{t.whatHappensIntro}</p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="rounded-3xl border border-brand-hairline bg-brand-surface/60 p-7">
            <h3 className="font-display text-base font-semibold text-brand-ink">
              {t.erasedHeading}
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm text-brand-muted">
              <li>{t.erased1}</li>
              <li>{t.erased2}</li>
              <li>{t.erased3}</li>
              <li>{t.erased4}</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-brand-hairline bg-brand-surface/60 p-7">
            <h3 className="font-display text-base font-semibold text-brand-ink">
              {t.keptHeading}
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm text-brand-muted">
              <li>{t.kept1}</li>
              <li>{t.kept2}</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-brand-primary/30 bg-brand-primary/5 p-7">
          <h3 className="font-display text-base font-semibold text-brand-ink">
            {t.graceHeading}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">{t.graceBody}</p>
        </div>

        <p className="mt-10 text-sm text-brand-muted">
          {t.privacyNote}{' '}
          <Link href={withLang('/privacy', lang)} className="font-medium text-brand-primary underline">
            {d.legal.privacyTitle}
          </Link>
          .
        </p>
      </main>

      <Footer d={d} lang={lang} year={new Date().getFullYear()} />
    </div>
  );
}
