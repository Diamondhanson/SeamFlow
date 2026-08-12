// ============================================================================
// Chart colours. Not hand-picked — every value below was run through the
// palette validator against this app's paper surface (#FAF7F2) and only kept
// once it passed.
//
// The dashboard needs far less colour than it first appears, because two rules
// remove most of the demand for it:
//
//   1. MONEY IS NEVER SUMMED ACROSS CURRENCIES. So a chart of revenue is never
//      one chart with a series per currency — it is one chart PER currency,
//      each single-hue. Faceting is the correct form here anyway, and it costs
//      no categorical slots.
//   2. Almost every other series is alone in its chart (orders per month,
//      invoices per month). A single series needs no identity colour: the
//      title names it.
//
// What is left is exactly two needs, so there are exactly two palettes.
// ============================================================================

/**
 * ORDINAL — one hue, monotone light→dark.
 *
 * For sequences where the order carries meaning and the reader should see that
 * order in the colour: funnel stages, order status from registered to
 * delivered. Validated: monotone L, adjacent ΔL ≥ 0.06, light end 2.05:1 on
 * paper (the floor is 2.0 — a step lighter than this vanishes into the page).
 */
export const ORDINAL = ['#BCA4E4', '#9E7BD9', '#7F52CE', '#6229C2', '#45148C'] as const;

/**
 * Pick `n` evenly-spread steps, STRONGEST FIRST.
 *
 * The ramp is defined light→dark because that is how a ramp is validated, but
 * it is handed out dark→light: every ordinal chart here is a funnel or a
 * pipeline, read top-down, and colour fading as the sequence narrows reads as
 * attrition. Handed out the other way the widest bar — the one carrying the
 * most weight — comes out the palest, which reads as de-emphasis.
 */
export function ordinalSteps(n: number): string[] {
  if (n <= 1) return [ORDINAL[3]];
  return Array.from({ length: n }, (_, i) =>
    ORDINAL[ORDINAL.length - 1 - Math.round((i / (n - 1)) * (ORDINAL.length - 1))],
  );
}

/**
 * Order status pinned to a fixed ramp step, in the enum's declared sequence.
 *
 * Sorting the query by status instead of by count is not enough on its own: if
 * a status has no rows it does not come back at all, every status below it
 * shifts up a slot, and the colours move. Pinning by KEY means "delivered" is
 * the same shade on the overview, on a filtered order list and on one tailor's
 * page — which is the only way the colour can carry meaning rather than
 * decorate a row's position.
 */
export const ORDER_STATUS_COLOR: Record<string, string> = {
  registered: ORDINAL[4],
  in_progress: ORDINAL[3],
  testing: ORDINAL[2],
  on_pause: ORDINAL[1],
  delivered: ORDINAL[0],
};

/**
 * CATEGORICAL — two slots, assigned in fixed order, never cycled.
 *
 * Two is not a compromise, it is the actual requirement: the only genuinely
 * multi-series chart on the dashboard is tailor signups against client signups.
 * Validated all-pairs: worst ΔE 30.0 under protanopia, 34.8 normal vision —
 * far above the 8 / 15 gates, which is what you get for using two hues from
 * opposite sides of the wheel instead of eight from all over it.
 *
 * A third series does not get a new hue invented for it. It gets a facet.
 */
export const CATEGORICAL = ['#5A18C9', '#B4622D'] as const;

/** The single-series default, for any chart with one thing in it. */
export const SOLO = '#5A18C9';

/**
 * STATUS — reserved meaning, never reused as "series 3". Always shipped with a
 * word beside it, never colour alone, so the meaning survives colourblindness,
 * greyscale printing and forced-colours mode.
 */
export const STATUS = {
  good: '#2F6B4F',
  warn: '#8A6A12',
  bad: '#9B3B2F',
} as const;

/** Chart surface + recessive furniture, so no component hardcodes them. */
export const CHART = {
  surface: '#FAF7F2',
  fill: '#EFE9DF',
  grid: 'rgba(26,23,20,0.10)',
  axis: 'rgba(26,23,20,0.28)',
  ink: '#1A1714',
  muted: '#5B554F',
  faint: '#767068',
} as const;
