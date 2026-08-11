// ============================================================================
// Decimal parsing for user-typed numbers.
//
// Two things kept going wrong before this existed, both silently:
//
// 1. **The comma.** SeamFlow is used in French-speaking Cameroon, and a French
//    Android keyboard puts a COMMA on the decimal key. `Number("2,5")` is NaN,
//    so a tailor typing 2,5 metres either lost the value or — where the field
//    is numeric-as-string (fabric yardage, cost) — sent "2,5" straight at a
//    Postgres numeric column, which rejects it. Some call sites handled this,
//    most didn't. Now there is one place that does.
//
// 2. **Stray whitespace.** Copy-paste and some keyboards produce non-breaking
//    or thin spaces used as thousands separators ("1 500"). Stripping them is
//    safe: a space never carries meaning inside a single typed number here.
//
// Use `parseDecimal` when the API wants a `number`, and `decimalString` when it
// wants numeric-as-string (see packages/schemas/src/fabric.ts). Never call
// `Number()` or `parseFloat()` on a raw input value.
// ============================================================================

/** Whitespace that can appear inside a typed number, including NBSP/thin space. */
const SEPARATOR_SPACE = /[\s   ]/g;

/**
 * Parse a user-typed number, tolerating a comma decimal separator.
 * Returns `null` for anything that isn't a finite number — including an empty
 * field, so callers can distinguish "not filled in" from "zero".
 */
export function parseDecimal(input: string | null | undefined): number | null {
  if (input == null) return null;
  const cleaned = String(input).replace(SEPARATOR_SPACE, '').replace(',', '.');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Same, but for the numeric-as-string API fields. Returns a canonical
 * dot-decimal string (never a comma), or `null` when the field is empty or
 * unparseable — so a typo can't reach the database as a malformed numeric.
 */
export function decimalString(input: string | null | undefined): string | null {
  const n = parseDecimal(input);
  return n == null ? null : String(n);
}

/**
 * Parse and clamp to a positive number, for quantities and prices where zero
 * or negative is meaningless. Returns `null` when it doesn't qualify.
 */
export function parsePositive(input: string | null | undefined): number | null {
  const n = parseDecimal(input);
  return n != null && n > 0 ? n : null;
}
