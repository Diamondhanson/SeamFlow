// ============================================================================
// Formatting. One place, because a dashboard that renders the same number two
// different ways on two pages is a dashboard you stop trusting.
// ============================================================================

/**
 * Money, in its own currency, at that currency's own precision.
 *
 * XAF has no minor unit — "FCFA 5,000.00" is not just ugly, it is wrong, and
 * Intl already knows this for every ISO 4217 code. Never convert, never sum
 * across currencies; there is no exchange-rate source in this system and a
 * total that mixes XAF with NGN is a confident lie.
 */
export function money(amount: number | string | null | undefined, currency: string | null): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return '—';
  if (!currency) return n.toLocaleString('en-GB');
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n);
  } catch {
    // Unknown code — show the code rather than swallowing it, so a bad
    // currency value on a row is visible instead of silently formatted away.
    return `${currency} ${n.toLocaleString('en-GB')}`;
  }
}

/** Bare number with thousands separators and no currency symbol. */
export const num = (n: number | string | null | undefined): string =>
  Number(n ?? 0).toLocaleString('en-GB');

export const date = (d: string | Date | null | undefined): string =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const dateTime = (d: string | Date | null | undefined): string =>
  d
    ? new Date(d).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export const monthLabel = (ym: string): string => {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'short' });
};

/** "3 days ago" / "in 5 days" — for delivery dates, where the gap is the point. */
export function relative(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const days = Math.round((new Date(d).getTime() - Date.now()) / 86_400_000);
  if (days === 0) return 'today';
  const rtf = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });
  if (Math.abs(days) < 31) return rtf.format(days, 'day');
  return rtf.format(Math.round(days / 30), 'month');
}

/** Enum values arrive as snake_case and must never be shown that way. */
export const label = (s: string | null | undefined): string =>
  s ? s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '—';

/** Coerce postgres bigint/numeric (which arrive as strings) to a number. */
export const n = (v: unknown): number => Number(v ?? 0);
