'use client';

import { useEffect, useState } from 'react';
import type { Dict, Lang } from '../lib/i18n';
import { Icon } from './icons';
import { LangToggle } from './LangToggle';

export function Nav({ d, lang }: { d: Dict; lang: Lang }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#features', label: d.nav.features },
    { href: '#how', label: d.nav.how },
    { href: '#faq', label: d.nav.faq },
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
        <a href="#top" className="flex items-center gap-2 text-brand-ink" aria-label="SeamFlow">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-lavender text-white shadow-glow">
            <Icon name="logo" className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">SeamFlow</span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
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

        <div className="flex items-center gap-3">
          <LangToggle lang={lang} className="hidden sm:inline-flex" />
          <a
            href="#get-app"
            className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-primaryDeep"
          >
            {d.nav.getApp}
          </a>
        </div>
      </nav>
    </header>
  );
}
