// ============================================================================
// The whole visual vocabulary of the dashboard, in one file.
//
// Rules, not cards. Dense figures read better separated by hairlines than
// boxed into panels — a box costs four borders per item and the eye ends up
// tracking containers instead of numbers.
//
// Nothing here is rounded. The Tailwind config collapses every radius utility
// to zero, so that holds even if someone pastes a `rounded-lg` in later.
// ============================================================================

import Link from 'next/link';
import type { ReactNode } from 'react';

/** The title block at the top of every page. */
export function PageHeader({
  title,
  lede,
  right,
  back,
}: {
  title: string;
  lede?: string;
  right?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-9 border-b-2 border-ink pb-5">
      {back ? (
        <Link href={back.href} className="mb-2 inline-block text-2xs uppercase tracking-widest text-copper hover:text-ink">
          ← {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        {right ? <div className="text-2xs uppercase tracking-widest text-faint">{right}</div> : null}
      </div>
      {lede ? <p className="mt-3 max-w-3xl text-sm text-muted">{lede}</p> : null}
    </header>
  );
}

/** Page-level section, separated by a rule rather than wrapped in a card. */
export function Section({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="mt-11 border-t border-ruleStrong pt-6 first:mt-0 first:border-t-0 first:pt-0">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0 text-2xs uppercase tracking-widest text-faint">{right}</div> : null}
      </header>
      {children}
    </section>
  );
}

/**
 * A single figure.
 *
 * Sans, not the display serif, and proportional figures rather than tabular:
 * Fraunces numerals at 30px read as ornament, and `tabular-nums` gives every
 * digit the width of a zero, which makes a standalone number look gappy.
 * Tabular is for columns, where alignment is the whole point — see `Cell`.
 */
export function Stat({
  label,
  value,
  hint,
  tone = 'ink',
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'ink' | 'muted' | 'primary' | 'bad';
  href?: string;
}) {
  const color =
    tone === 'primary' ? 'text-primary' : tone === 'muted' ? 'text-faint' : tone === 'bad' ? 'text-bad' : 'text-ink';
  const body = (
    <>
      <div className={`text-3xl font-semibold leading-none tracking-tight ${color}`}>{value}</div>
      <div className="mt-2 text-2xs uppercase tracking-widest text-faint">{label}</div>
      {hint ? <div className="mt-1 text-xs leading-snug text-muted">{hint}</div> : null}
    </>
  );
  const cls = 'block border-l border-rule py-1 pl-4';
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-primary`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function StatRow({ cols = 6, children }: { cols?: 3 | 4 | 5 | 6; children: ReactNode }) {
  const map = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' };
  return <div className={`grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 ${map[cols]}`}>{children}</div>;
}

/** Dense table. Hairline rows, tabular figures, right-aligned numbers. */
export function Table({
  head,
  children,
  align = [],
}: {
  head: string[];
  children: ReactNode;
  align?: ('left' | 'right')[];
}) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-rule bg-surface">
            {head.map((h, i) => (
              <th
                key={h || `col${i}`}
                className={`px-3 py-2 font-sans text-2xs font-medium uppercase tracking-widest text-faint ${
                  align[i] === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children, href }: { children: ReactNode; href?: string }) {
  return (
    <tr className={`border-b border-rule ${href ? 'cursor-pointer' : ''} hover:bg-surface/60`}>{children}</tr>
  );
}

export function Cell({
  children,
  right,
  mono,
  dim,
  wide,
}: {
  children: ReactNode;
  right?: boolean;
  mono?: boolean;
  dim?: boolean;
  wide?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2.5 align-top ${right ? 'text-right' : ''} ${
        mono ? 'font-mono tnum text-[0.8125rem]' : ''
      } ${dim ? 'text-muted' : ''} ${wide ? '' : 'whitespace-nowrap'}`}
    >
      {children}
    </td>
  );
}

/** A cell whose content navigates. Used instead of making the whole row a link,
 *  which cannot be done validly inside a <td>. */
export function LinkCell({ href, children, sub }: { href: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <td className="whitespace-nowrap px-3 py-2.5 align-top">
      <Link href={href} className="font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-primary">
        {children}
      </Link>
      {sub ? <span className="mt-0.5 block text-xs text-faint">{sub}</span> : null}
    </td>
  );
}

/** Small status word. Colour carries meaning; the word carries it too, so it
 *  survives colourblindness, greyscale printing and forced-colours mode. */
export function Flag({ severity, label }: { severity: 'ok' | 'warn' | 'bad' | 'idle'; label?: string }) {
  const map = {
    ok: ['clear', 'text-good'],
    warn: ['review', 'text-warn'],
    bad: ['broken', 'text-bad'],
    idle: ['—', 'text-faint'],
  } as const;
  const [fallback, cls] = map[severity];
  return <span className={`text-2xs uppercase tracking-widest ${cls}`}>{label ?? fallback}</span>;
}

/** A neutral chip for an enum value. Never coloured — order status is not good
 *  or bad news, and colouring it implies a judgement the data does not carry. */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="border border-rule bg-surface px-1.5 py-0.5 text-2xs uppercase tracking-widest text-muted">
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-3 text-sm italic text-faint">{children}</p>;
}

/** A paragraph that argues with the numbers above it. */
export function Note({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'copper' }) {
  return tone === 'copper' ? (
    <p className="mt-7 max-w-3xl border-l-2 border-copper pl-4 text-sm leading-relaxed text-copper">{children}</p>
  ) : (
    <p className="mt-7 max-w-3xl text-sm leading-relaxed text-muted">{children}</p>
  );
}

/** Definition list for a detail page header. */
export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
      {items.map(([k, v]) => (
        <div key={k} className="border-l border-rule pl-4">
          <dt className="text-2xs uppercase tracking-widest text-faint">{k}</dt>
          <dd className="mt-1 text-sm text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  make,
}: {
  page: number;
  pageSize: number;
  total: number;
  make: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="mt-4 flex items-center justify-between text-xs text-muted">
      <span className="tnum">
        {from}–{to} of {total.toLocaleString('en-GB')}
      </span>
      <span className="flex gap-4">
        {page > 1 ? (
          <Link href={make(page - 1)} className="text-copper hover:text-ink">
            ← Previous
          </Link>
        ) : (
          <span className="text-faint">← Previous</span>
        )}
        {page < pages ? (
          <Link href={make(page + 1)} className="text-copper hover:text-ink">
            Next →
          </Link>
        ) : (
          <span className="text-faint">Next →</span>
        )}
      </span>
    </div>
  );
}
