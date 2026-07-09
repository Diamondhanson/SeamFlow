'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Lang } from '../lib/i18n';
import { withLang } from '../lib/i18n';
import { Icon } from './icons';

/** EN / FR switch. Links to the same path with the ?lang query flipped. */
export function LangToggle({ lang, className = '' }: { lang: Lang; className?: string }) {
  const pathname = usePathname() || '/';
  const base = (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-brand-border bg-brand-surface/70 p-1 text-sm ${className}`}
    >
      <Icon name="globe" className="ml-1 h-4 w-4 text-brand-muted" />
      {(['en', 'fr'] as Lang[]).map((l) => (
        <Link
          key={l}
          href={withLang(pathname, l)}
          aria-current={lang === l ? 'true' : undefined}
          className={`rounded-full px-2.5 py-1 font-medium uppercase transition ${
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
