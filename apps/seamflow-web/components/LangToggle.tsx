'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Lang } from '../lib/i18n';
import { LANGS, withLang } from '../lib/i18n';
import { Icon } from './icons';

/**
 * Language switch. Links to the same page in each language we publish.
 *
 * Reads LANGS rather than a hardcoded pair, so a new language appears here the
 * moment it has a route tree. The codes are shown uppercase.
 *
 * Sizing is deliberately tighter below `sm`: at five languages the row is what
 * decides whether a phone scrolls sideways, so the globe is dropped and the
 * codes shrink there. If this grows past six it wants to become a dropdown of
 * endonyms rather than a row of two-letter codes — a sixth code would put the
 * header back over a 360px viewport.
 */
export function LangToggle({ lang, className = '' }: { lang: Lang; className?: string }) {
  const pathname = usePathname() || '/';
  const base = (
    <div
      className={`inline-flex items-center gap-0.5 rounded-full border border-brand-border bg-brand-surface/70 p-1 text-xs sm:gap-1 sm:text-sm ${className}`}
    >
      <Icon name="globe" className="ml-1 hidden h-4 w-4 text-brand-muted sm:block" />
      {LANGS.map((l) => (
        <Link
          key={l}
          href={withLang(pathname, l)}
          aria-current={lang === l ? 'true' : undefined}
          className={`rounded-full px-2 py-1 font-medium uppercase transition sm:px-2.5 ${
            lang === l
              ? 'bg-brand-primary text-white shadow-pill'
              : 'text-brand-muted hover:text-brand-ink'
          }`}
        >
          {l}
        </Link>
      ))}
    </div>
  );
  return base;
}
