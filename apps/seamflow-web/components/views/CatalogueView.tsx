import type { FeedPostPublic, TailorPublicProfile } from '@seamflow/schemas';
import type { Lang } from '../../lib/i18n';
import { SITE, WEB_APP_URL } from '../../lib/i18n';
import { getCatalogueCopy } from '../../lib/catalogue';
import { CatalogueGrid } from '../CatalogueGrid';

interface Props {
  lang: Lang;
  tailor: TailorPublicProfile;
  posts: FeedPostPublic[];
}

/**
 * A tailor's public shop window.
 *
 * Reached three ways — a browser following the shared link, a WhatsApp preview
 * expanding it, and (once the client app ships) the app intercepting the same
 * URL. Everything here comes from `GET /public/tailors/:slug/catalogue`, which
 * is also what the app reads, so the three surfaces cannot drift.
 *
 * Layout order is deliberate: who made this → the work → how to reach them.
 * The contact button is repeated at the bottom because on a phone the header
 * has long scrolled away by the time someone has decided they want a piece.
 */
export function CatalogueView({ lang, tailor, posts }: Props) {
  const c = getCatalogueCopy(lang);
  const waHref = whatsappHref(tailor.whatsapp, c.whatsappPrefill(tailor.businessName));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <header className="mb-10 text-center sm:mb-14">
        <div className="mx-auto mb-6 h-px w-12 bg-accent/70" />

        {tailor.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tailor.avatarUrl}
            alt=""
            className="mx-auto mb-5 h-20 w-20 rounded-full border border-border/60 object-cover shadow-sm sm:h-24 sm:w-24"
          />
        ) : null}

        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          {c.eyebrow}
        </p>
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          {tailor.businessName}
        </h1>

        {tailor.city ? <p className="mt-2 text-sm text-muted">{tailor.city}</p> : null}

        {tailor.bio ? (
          <p className="mx-auto mt-5 max-w-xl whitespace-pre-line text-[15px] leading-relaxed text-ink/80">
            {tailor.bio}
          </p>
        ) : null}

        <Badges tailor={tailor} copy={c} />

        {tailor.specialties.length ? (
          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {tailor.specialties.map((s) => (
              <span
                key={s}
                className="rounded-full border border-border/60 bg-surface px-3 py-1 text-[12px] capitalize tracking-wide text-muted"
              >
                {s.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        ) : null}

        {waHref ? (
          <div className="mt-8">
            <WhatsAppButton href={waHref} label={c.whatsappCta} />
            <p className="mt-2.5 text-[12px] text-muted">{c.whatsappHint}</p>
          </div>
        ) : null}
      </header>

      {posts.length ? (
        <section>
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
              {c.worksTitle}
            </h2>
            <span className="text-[12px] tabular-nums text-muted">{c.pieces(posts.length)}</span>
          </div>
          <CatalogueGrid
            posts={posts}
            currency={tailor.currency}
            labels={{
              close: c.closeLabel,
              next: c.nextPhoto,
              prev: c.prevPhoto,
              // Formatted here, on the server, and handed over as plain
              // strings. The alternative — passing the copy object so the
              // client can format — means passing functions across the
              // server/client boundary, which React refuses at render time.
              priceById: priceMap(posts, tailor.currency, c.fromPrice),
            }}
          />
        </section>
      ) : (
        <EmptyState title={c.emptyTitle} body={c.emptyBody} />
      )}

      <footer className="mt-16 border-t border-hairline pt-8 text-center">
        {waHref ? (
          <div className="mb-8">
            <WhatsAppButton href={waHref} label={c.whatsappCta} />
          </div>
        ) : null}

        <a
          href={WEB_APP_URL}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surfaceElevated"
        >
          {c.appCta}
        </a>

        <p className="mt-6 text-[12px] text-muted">
          <a href={SITE.url} className="hover:text-ink">
            {c.poweredBy}
          </a>
        </p>
      </footer>
    </main>
  );
}

function Badges({ tailor, copy }: { tailor: TailorPublicProfile; copy: ReturnType<typeof getCatalogueCopy> }) {
  const items: string[] = [];
  if (tailor.isVerified) items.push(copy.verified);
  if (tailor.acceptsRemote) items.push(copy.acceptsRemote);
  if (tailor.responseTimeHours != null) items.push(copy.respondsIn(tailor.responseTimeHours));
  items.push(copy.memberSince(new Date(tailor.memberSince).getFullYear().toString()));

  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-[12px] text-muted">
      {items.map((label, i) => (
        <span key={label} className="flex items-center gap-2.5">
          {i > 0 ? <span aria-hidden className="h-1 w-1 rounded-full bg-border" /> : null}
          {label}
        </span>
      ))}
    </div>
  );
}

function WhatsAppButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2.5 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-pill transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99]"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35Z" />
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.25-4.35c0-4.53 3.7-8.22 8.23-8.22a8.17 8.17 0 0 1 5.81 2.41 8.17 8.17 0 0 1 2.41 5.82c0 4.53-3.69 8.2-8.23 8.2Z" />
      </svg>
      {label}
    </a>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-4xl border border-border/70 bg-surface/70 px-6 py-14 text-center">
      <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

/**
 * Pre-format every price the wall will show, keyed by post id.
 *
 * `startingPrice` arrives as a numeric(12,2) string in MAJOR units — "25000.00"
 * means twenty-five thousand francs, not two hundred and fifty. Don't divide by
 * 100 here; that mistake is easy to make because plenty of payment code stores
 * minor units, and it would show every West African price two orders of
 * magnitude too small.
 *
 * The digit count comes from the currency, not from us: XAF and XOF — the home
 * markets — have no minor unit, so "25000.00" must print as FCFA 25,000 and
 * never as FCFA 25,000.00. Intl knows which currencies those are.
 */
function priceMap(
  posts: FeedPostPublic[],
  fallbackCurrency: string,
  format: (price: string) => string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of posts) {
    if (p.startingPrice == null || p.startingPrice === '') continue;
    const value = Number(p.startingPrice);
    if (!Number.isFinite(value)) continue;

    const currency = p.currency ?? fallbackCurrency;
    let money: string;
    try {
      money = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
    } catch {
      // Unknown ISO code — better a plain number with a suffix than nothing.
      money = `${value} ${currency}`;
    }
    out[p.id] = format(money);
  }
  return out;
}

/**
 * Build the `wa.me` link, or null when this shop has published no number.
 *
 * Null is the default and the common case — `public_whatsapp` is opt-in and
 * starts empty. Render nothing rather than a disabled-looking button: a dead
 * contact control on a shop page is worse than no control at all.
 */
function whatsappHref(e164: string | null, prefill: string): string | null {
  if (!e164) return null;
  const digits = e164.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(prefill)}`;
}
