'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Dict, Lang } from '../lib/i18n';
import { withLang } from '../lib/i18n';
import { Icon } from './icons';

export function Faq({ d, lang }: { d: Dict; lang: Lang }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-5 py-16 sm:py-20">
      <h2 className="text-center font-display text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">
        {d.faq.heading}
      </h2>
      <div className="mt-10 space-y-3">
        {d.faq.items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-brand-hairline bg-brand-surface/60"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-display text-base font-semibold text-brand-ink">
                  {item.q}
                </span>
                <Icon
                  name="chevron"
                  className={`h-5 w-5 shrink-0 text-brand-muted transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-5 pb-5 text-[15px] leading-relaxed text-brand-muted">
                    {item.a}
                    {item.href ? (
                      <>
                        {' '}
                        <Link
                          href={withLang(item.href, lang)}
                          className="font-medium text-brand-primary underline underline-offset-2"
                        >
                          {item.linkLabel}
                        </Link>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
