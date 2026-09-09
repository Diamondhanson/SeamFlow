'use client';

import { useEffect, useState } from 'react';
import type { Dict, Lang } from '../lib/i18n';
import { withLang, WEB_APP_URL } from '../lib/i18n';
import { Icon } from './icons';
import { Wordmark } from './Wordmark';
import { LangToggle } from './LangToggle';
import { AudienceToggle } from './AudienceToggle';

/**
 * `onHome` tells the nav whether its anchor links can stay as bare hashes.
 * On a sub-page (e.g. /tailor-assistant) they must be absolute, or they scroll
 * to nothing — and a nav full of dead links is both a UX and a crawl problem.
 */
export function Nav({ d, lang, onHome = true }: { d: Dict; lang: Lang; onHome?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const home = onHome ? '' : withLang('/', lang);
  const links = [
    { href: `${home}#features`, label: d.nav.features },
    { href: withLang('/tailor-assistant', lang), label: d.nav.assistant },
    { href: `${home}#how`, label: d.nav.how },
    { href: `${home}#faq`, label: d.nav.faq },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-brand-hairline bg-brand-bg/95'
          : 'border-b border-transparent'
      }`}
    >
      <nav
        className={`mx-auto flex max-w-6xl items-center justify-between px-5 transition-all duration-300 ${
          scrolled ? 'py-2.5' : 'py-4'
        }`}
      >
        <a
          href={onHome ? '#top' : home}
          className="flex items-center gap-2 text-brand-ink"
          aria-label="SeamFlow"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-lavender text-white shadow-glow">
            <Icon name="logo" className="h-5 w-5" />
          </span>
          <Wordmark className="h-[18px] w-auto" />
        </a>

        {/* Tailor-only: these anchors point to sections that are hidden in the
            customer view. Wrapped (not classed directly) so the outer `t-only`
            doesn't fight the inner responsive `hidden md:flex`. */}
        <div className="t-only">
          <div className="hidden items-center gap-6 md:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-brand-muted transition hover:text-brand-ink"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* The audience switch — the primary control of the page. Desktop-only
              here; the hero carries a full-width one on phones (nav space at
              375px can't hold wordmark + toggle + CTA on one line). */}
          <AudienceToggle
            tailorLabel={d.audience.toggle.tailor}
            customerLabel={d.audience.toggle.customer}
            className="hidden md:inline-flex"
          />
          {/* Hidden on phones on purpose: at 375px the header already has
              to fit the wordmark and a CTA that wraps in the longer
              languages, and a third control pushes it to three lines. The
              footer toggle is the mobile route. */}
          <LangToggle lang={lang} className="hidden lg:block" />
          <a
            href={WEB_APP_URL || `${home}#get-app`}
            className="rounded-full bg-audience px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-audienceDeep"
          >
            {d.nav.useOnBrowser}
          </a>
        </div>
      </nav>
    </header>
  );
}
