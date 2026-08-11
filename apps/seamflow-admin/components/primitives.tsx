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

import type { ReactNode } from 'react';

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
    <section className="border-t border-ruleStrong pt-6 mt-12 first:mt-0 first:border-t-0 first:pt-0">
      <header className="flex items-baseline justify-between gap-6 mb-5">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
          {subtitle ? <p className="text-sm text-muted mt-1 max-w-2xl">{subtitle}</p> : null}
        </div>
        {right ? <div className="text-2xs uppercase tracking-widest text-faint shrink-0">{right}</div> : null}
      </header>
      {children}
    </section>
  );
}

/**
 * A single figure. The number leads at display size because that is what the
 * eye is here for; the label sits under it, quiet.
 */
export function Stat({
  label,
  value,
  hint,
  tone = 'ink',
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'ink' | 'muted' | 'primary';
}) {
  const color = tone === 'primary' ? 'text-primary' : tone === 'muted' ? 'text-faint' : 'text-ink';
  return (
    <div className="border-l border-rule pl-4 py-1">
      <div className={`font-display text-3xl font-semibold tnum leading-none ${color}`}>{value}</div>
      <div className="text-2xs uppercase tracking-widest text-faint mt-2">{label}</div>
      {hint ? <div className="text-xs text-muted mt-1 leading-snug">{hint}</div> : null}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-6 gap-y-8 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">{children}</div>;
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
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-y border-rule bg-surface">
            {head.map((h, i) => (
              <th
                key={h}
                className={`px-3 py-2 font-sans text-2xs uppercase tracking-widest text-faint font-medium ${
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

export function Row({ children }: { children: ReactNode }) {
  return <tr className="border-b border-rule hover:bg-surface/60">{children}</tr>;
}

export function Cell({
  children,
  right,
  mono,
  dim,
}: {
  children: ReactNode;
  right?: boolean;
  mono?: boolean;
  dim?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2.5 align-top ${right ? 'text-right' : ''} ${
        mono ? 'font-mono tnum text-[0.8125rem]' : ''
      } ${dim ? 'text-muted' : ''}`}
    >
      {children}
    </td>
  );
}

/**
 * Horizontal funnel bar. Width is proportional to the widest step, so a zero
 * renders as a hairline rather than vanishing — an invisible step reads as
 * "not measured" when it means "nobody did this".
 */
export function Bar({ value, max, tone = 'primary' }: { value: number; max: number; tone?: 'primary' | 'copper' }) {
  const pct = max > 0 ? Math.max(value > 0 ? 2 : 0.6, (value / max) * 100) : 0.6;
  return (
    <div className="h-2 bg-surface w-full">
      <div
        className={tone === 'copper' ? 'h-2 bg-copper' : 'h-2 bg-primary'}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Small status word. Colour carries meaning; the word carries it too. */
export function Flag({ severity }: { severity: 'ok' | 'warn' | 'bad' }) {
  const map = {
    ok: ['clear', 'text-good'],
    warn: ['review', 'text-warn'],
    bad: ['broken', 'text-bad'],
  } as const;
  const [label, cls] = map[severity];
  return <span className={`text-2xs uppercase tracking-widest ${cls}`}>{label}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-faint italic py-3">{children}</p>;
}
