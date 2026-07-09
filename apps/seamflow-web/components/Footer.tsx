import Link from 'next/link';
import type { Dict, Lang } from '../lib/i18n';
import { withLang } from '../lib/i18n';
import { Icon } from './icons';
import { LangToggle } from './LangToggle';

export function Footer({ d, lang, year }: { d: Dict; lang: Lang; year: number }) {
  const f = d.footer;
  return (
    <footer className="border-t border-brand-hairline bg-brand-surface/50">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 text-brand-ink">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-primary to-brand-lavender text-white">
                <Icon name="logo" className="h-4 w-4" />
              </span>
              <span className="font-display text-base font-bold">SeamFlow</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-brand-muted">{f.tagline}</p>
          </div>

          <FooterCol title={f.product}>
            <FooterA href="#features">{f.links.features}</FooterA>
            <FooterA href="#how">{f.links.how}</FooterA>
            <FooterA href="#faq">{f.links.faq}</FooterA>
          </FooterCol>

          <FooterCol title={f.legal}>
            <FooterLink href={withLang('/privacy', lang)}>{f.links.privacy}</FooterLink>
            <FooterLink href={withLang('/terms', lang)}>{f.links.terms}</FooterLink>
            <FooterLink href={withLang('/support', lang)}>{f.links.support}</FooterLink>
          </FooterCol>

          <FooterCol title={f.contact}>
            <a
              href={`mailto:${f.email}`}
              className="text-sm text-brand-muted transition hover:text-brand-ink"
            >
              {f.email}
            </a>
            <div className="pt-2">
              <LangToggle lang={lang} />
            </div>
          </FooterCol>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-brand-hairline pt-6 text-sm text-brand-muted sm:flex-row sm:items-center">
          <span>{f.rights.replace('{year}', String(year))}</span>
          <span className="italic">{f.madeWith}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">
        {title}
      </h3>
      <div className="mt-4 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}
function FooterA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-sm text-brand-muted transition hover:text-brand-ink">
      {children}
    </a>
  );
}
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-brand-muted transition hover:text-brand-ink">
      {children}
    </Link>
  );
}
