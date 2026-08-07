'use client';

// ============================================================================
// "Use it in your browser" — the third install option, alongside App Store and
// Android APK.
//
// The browser build (seamflow-app's web target) isn't deployed yet, so this
// badge has two modes, driven entirely by WEB_APP_URL in lib/i18n:
//
//   WEB_APP_URL === ''  → renders with a "coming soon" ribbon; clicking shows a
//                         toast rather than navigating nowhere.
//   WEB_APP_URL set     → renders as a plain link to the web app. The ribbon,
//                         the toast and all of this client-side code fall away.
//
// So shipping the real thing is a one-line change in lib/i18n.ts.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dict } from '../lib/i18n';
import { WEB_APP_URL } from '../lib/i18n';
import { Icon } from './icons';

const AUTO_DISMISS_MS = 6000;

// <StoreBadges> is rendered twice on the landing page (hero + final CTA), so
// two badges can each hold toast state. They share this registry to guarantee
// only one toast is on screen at a time — otherwise clicking the second badge
// while the first toast is still up stacks two of them in the same fixed spot.
const openers = new Set<(open: boolean) => void>();

function BadgeChrome({
  eyebrow,
  title,
  soon,
}: {
  eyebrow: string;
  title: string;
  soon?: string;
}) {
  return (
    <>
      {soon ? (
        <span className="absolute -right-2 -top-2 rounded-full bg-brand-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-ink shadow-pill">
          {soon}
        </span>
      ) : null}
      <span className="h-7 w-7 shrink-0 text-white">
        <Icon name="devices" className="h-7 w-7" />
      </span>
      <span className="leading-tight">
        <span className="block text-[10px] uppercase tracking-wide text-white/70">
          {eyebrow}
        </span>
        <span className="block text-sm font-semibold">{title}</span>
      </span>
    </>
  );
}

const CHROME =
  'group relative inline-flex select-none items-center gap-3 rounded-2xl bg-brand-ink px-4 py-2.5 text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-primaryDeep hover:shadow-glow';

export function WebAppBadge({ d }: { d: Dict }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Register this badge's setter so a sibling can close us before opening.
  useEffect(() => {
    openers.add(setOpen);
    return () => {
      openers.delete(setOpen);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Esc dismisses, matching every other transient surface on the site.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const show = useCallback(() => {
    openers.forEach((setter) => {
      if (setter !== setOpen) setter(false);
    });
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), AUTO_DISMISS_MS);
  }, []);

  // Deployed: a normal link, no JavaScript behaviour at all.
  if (WEB_APP_URL) {
    return (
      <a href={WEB_APP_URL} className={CHROME}>
        <BadgeChrome eyebrow={d.store.webEyebrow} title={d.store.webCta} />
      </a>
    );
  }

  return (
    <>
      <button type="button" onClick={show} className={CHROME}>
        <BadgeChrome
          eyebrow={d.store.webEyebrow}
          title={d.store.webCta}
          soon={d.store.soon}
        />
      </button>

      {open ? (
        <div
          role="status"
          aria-live="polite"
          className="animate-toast-in fixed bottom-6 left-1/2 z-[60] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl bg-brand-ink px-5 py-4 text-white shadow-glow"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15">
              <Icon name="devices" className="h-4 w-4" />
            </span>
            <p className="flex-1 text-sm leading-relaxed text-white/90">
              {d.store.webToast}
            </p>
            <button
              type="button"
              onClick={close}
              aria-label={d.store.webToastDismiss}
              className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
