import Link from 'next/link';
import type { Dict, Lang } from '../lib/i18n';
import { withLang } from '../lib/i18n';
import { Icon } from './icons';
import { Wordmark } from './Wordmark';
import { LangToggle } from './LangToggle';

export function Footer({
  d,
  lang,
  year,
  onHome = true,
}: {
  d: Dict;
  lang: Lang;
  year: number;
  onHome?: boolean;
}) {
  const f = d.footer;
  // Same reasoning as <Nav>: bare hashes only resolve on the landing page.
  const home = onHome ? '' : withLang('/', lang);
  return (
    <footer className="border-t border-brand-hairline bg-brand-surface/50">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 text-brand-ink">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-primary to-brand-lavender text-white">
                <Icon name="logo" className="h-4 w-4" />
              </span>
              <Wordmark className="h-4 w-auto" />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-brand-muted">{f.tagline}</p>

            {/* Product Hunt.
                Served from Product Hunt's own host, as their embed intends, so
                the badge stays current and the launch registers the view. The
                CSP in next.config.mjs does not restrict img-src, so nothing
                needs opening for it.

                A plain <img>, not next/image: the badge is an SVG, and next's
                optimizer passes SVGs through untouched unless
                dangerouslyAllowSVG is set — so routing it through the
                optimizer would add a hop and buy nothing.

                width/height are the badge's real 250x54 so the footer does not
                jump when it arrives, and it loads lazily because it sits below
                every fold on the site. */}
            <a
              href="https://www.producthunt.com/products/seamflow?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-seamflow"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block transition hover:opacity-80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1287175&theme=dark&t=1792534704802"
                alt={f.productHunt}
                width={250}
                height={54}
                loading="lazy"
                decoding="async"
              />
            </a>
          </div>

          <FooterCol title={f.product}>
            <FooterA href={`${home}#features`}>{f.links.features}</FooterA>
            <FooterLink href={withLang('/tailor-assistant', lang)}>
              {f.links.assistant}
            </FooterLink>
            <FooterLink href={withLang('/alternatives/tailor-assist', lang)}>
              {f.links.compare}
            </FooterLink>
            <FooterA href={`${home}#how`}>{f.links.how}</FooterA>
            <FooterA href={`${home}#faq`}>{f.links.faq}</FooterA>
          </FooterCol>

          <FooterCol title={f.legal}>
            <FooterLink href={withLang('/privacy', lang)}>{f.links.privacy}</FooterLink>
            <FooterLink href={withLang('/terms', lang)}>{f.links.terms}</FooterLink>
            <FooterLink href={withLang('/support', lang)}>{f.links.support}</FooterLink>
            <FooterLink href={withLang('/delete-account', lang)}>{f.links.deleteAccount}</FooterLink>
          </FooterCol>

          <FooterCol title={f.contact}>
            <a
              href={`mailto:${f.email}`}
              className="text-sm text-brand-muted transition hover:text-brand-ink"
            >
              {f.email}
            </a>
            <a
              href={`tel:${f.phone.replace(/[^+\d]/g, '')}`}
              className="text-sm text-brand-muted transition hover:text-brand-ink"
            >
              {f.phone}
            </a>
            <div className="pt-2">
              <LangToggle lang={lang} placement="top" />
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
