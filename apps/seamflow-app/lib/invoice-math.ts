// ============================================================================
// Invoice arithmetic — one place, so the line total and the subtotal can never
// disagree.
//
// They used to be two copies of the same expression (the row rendered one, the
// useMemo computed the other). That is exactly the shape of bug where a fix
// lands on one and not the other and the column stops adding up.
//
// Rounding matters now that quantities can be fractional. Binary floats make
// 1.1 × 1.1 into 1.2100000000000002; `Intl.NumberFormat` hides that when a
// currency is set, but the invoice falls back to `String(n)` when it isn't —
// and the un-rounded value is also what gets saved and printed on the PDF.
// Every figure that represents money is therefore rounded to 2 decimal places
// at the point it is computed, not merely where it is displayed.
// ============================================================================

import { roundToCurrency } from '@seamflow/utils';
import { parseDecimal } from './numeric';

/**
 * Round to the currency's smallest real unit, killing binary-float noise.
 *
 * Was hardcoded to 2dp, which is wrong for XAF/XOF — this product's home
 * currencies have NO minor unit. That stored 999.90 and printed "FCFA 1,000":
 * a bill whose stored figure was not the figure on the paper. Omitting the
 * currency keeps the old 2dp behaviour for call sites that genuinely have none.
 */
export function roundMoney(n: number, currency?: string | null): number {
  return roundToCurrency(n, currency);
}

/** A number from a text field, treating blank/garbage as 0. */
export function amount(input: string | null | undefined): number {
  return parseDecimal(input) ?? 0;
}

/**
 * One line's total. Negative quantities and prices are clamped to zero rather
 * than allowed to subtract from the bill — a negative line is always a typo,
 * and a credit belongs in the deposit field.
 */
export function lineTotal(qty: string, price: string, currency?: string | null): number {
  return roundMoney(Math.max(0, amount(qty)) * Math.max(0, amount(price)), currency);
}

/** Sum of every line, rounded once at the end. */
export function subtotalOf(
  lines: { qty: string; price: string }[],
  currency?: string | null,
): number {
  return roundMoney(
    lines.reduce((sum, l) => sum + lineTotal(l.qty, l.price, currency), 0),
    currency,
  );
}

/** What's still owed after the deposit. Can be negative if over-paid. */
export function balanceOf(
  subtotal: number,
  deposit: string,
  currency?: string | null,
): number {
  return roundMoney(subtotal - Math.max(0, amount(deposit)), currency);
}
