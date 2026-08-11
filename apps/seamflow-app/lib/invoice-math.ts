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

import { parseDecimal } from './numeric';

/** Round to 2dp, killing binary-float noise. `+ Number.EPSILON` fixes the
 *  classic 1.005 case that would otherwise round down. */
export function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
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
export function lineTotal(qty: string, price: string): number {
  return roundMoney(Math.max(0, amount(qty)) * Math.max(0, amount(price)));
}

/** Sum of every line, rounded once at the end. */
export function subtotalOf(lines: { qty: string; price: string }[]): number {
  return roundMoney(lines.reduce((sum, l) => sum + lineTotal(l.qty, l.price), 0));
}

/** What's still owed after the deposit. Can be negative if over-paid. */
export function balanceOf(subtotal: number, deposit: string): number {
  return roundMoney(subtotal - Math.max(0, amount(deposit)));
}
