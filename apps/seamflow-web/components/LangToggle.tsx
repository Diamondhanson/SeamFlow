'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import type { Lang } from '../lib/i18n';
import { LANGS, LANG_LABELS, LANG_SHORT, withLang } from '../lib/i18n';
import { Icon } from './icons';

/**
 * Language switch — a dropdown of endonyms.
 *
 * It used to be a row of two-letter codes, which worked at two languages and
 * broke at five: the row plus the wordmark overflowed a 376px viewport, and
 * "SW" is not a word anyone recognises as the name of their language. A menu
 * costs one tap and buys room for every language we will ever ship.
 *
 * Reads LANGS/LANG_LABELS rather than a hardcoded list, so a new language
 * appears here the moment it has a route tree.
 *
 * The options are real <Link>s and stay mounted while closed rather than being
 * conditionally rendered — a crawler that does not open the menu still finds
 * every translation in the markup. Closed, they are hidden from the
 * accessibility tree and taken out of the tab order, so nobody tabs into a menu
 * they cannot see.
 */
export function LangToggle({
  lang,
  className = '',
  placement = 'bottom',
}: {
  lang: Lang;
  className?: string;
  /** `top` opens upward — for the footer, where downward would leave the page. */
  placement?: 'bottom' | 'top';
}) {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Close on outside click and on Escape. Both are what a menu is expected to
  // do, and without them a stray tap leaves it hanging over the page.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        root.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        className={`inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-surface/70 py-1.5 ps-2.5 pe-2 text-sm font-medium text-brand-ink shadow-pill transition hover:bg-brand-surface sm:gap-2 sm:ps-3 ${
          open ? 'bg-brand-surface' : ''
        }`}
      >
        <Icon name="globe" className="h-4 w-4 shrink-0 text-brand-muted" />
        {/* The endonym is the useful label, but it is also the widest thing in
            a phone header. Below `sm` a short label stands in — from a map, not
            `lang.toUpperCase()`, which would put "AR" in Latin capitals inside
            an Arabic page. */}
        <span className="hidden sm:inline">{LANG_LABELS[lang]}</span>
        <span className="sm:hidden">{LANG_SHORT[lang]}</span>
        <Icon
          name="chevron"
          className={`h-3.5 w-3.5 shrink-0 text-brand-muted transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      <ul
        id={menuId}
        role="menu"
        aria-hidden={!open}
        className={`absolute end-0 z-50 min-w-[11rem] rounded-2xl border border-brand-border bg-brand-bg p-1.5 shadow-card transition duration-150 ${
          placement === 'top' ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'
        } ${
          open
            ? 'visible translate-y-0 scale-100 opacity-100'
            : `invisible scale-95 opacity-0 ${
                placement === 'top' ? 'translate-y-1' : '-translate-y-1'
              }`
        }`}
      >
        {LANGS.map((l) => {
          const active = l === lang;
          return (
            <li key={l} role="none">
              <Link
                href={withLang(pathname, l)}
                role="menuitem"
                hrefLang={l}
                lang={l}
                tabIndex={open ? 0 : -1}
                aria-current={active ? 'true' : undefined}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-brand-primary/10 font-semibold text-brand-primary'
                    : 'text-brand-muted hover:bg-brand-surface hover:text-brand-ink'
                }`}
              >
                {LANG_LABELS[l]}
                {active ? <Icon name="check" className="h-4 w-4 shrink-0" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
