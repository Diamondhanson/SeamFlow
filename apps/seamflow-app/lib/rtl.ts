// ============================================================================
// Direction helpers for the few places logical style properties don't reach.
//
// React Native flips `marginStart`/`paddingEnd`/`start`/`end` automatically
// once `I18nManager.forceRTL(true)` is set, so almost all layout needs nothing
// more than the logical property name. These are the exceptions.
// ============================================================================

import { IS_RTL } from '@seamflow/ui';

/**
 * `textAlign` has no logical value in React Native — the type is
 * `'auto' | 'left' | 'right' | 'center' | 'justify'`, with no `'start'`/`'end'`.
 * So a value that should hug the far edge of its row has to say which edge that
 * is. This is the one place the "just use logical properties" rule breaks, and
 * it is exactly where a careful reading of the rule gets it wrong.
 *
 * Prefer letting flexbox do the alignment where you can — `justifyContent`
 * flips on its own. Reach for this only when the text itself must align, e.g.
 * a wrapped value in a space-between row or an amount column.
 */
export const TEXT_END: 'left' | 'right' = IS_RTL ? 'left' : 'right';

/** The mirror of {@link TEXT_END}, for the rare value that hugs the near edge. */
export const TEXT_START: 'left' | 'right' = IS_RTL ? 'right' : 'left';

/**
 * Directional arrows, for interpolation into translated strings.
 *
 * The arrows used to live INSIDE the copy — `'{from} → {to}'`, `'← Use a
 * different email'`. Under RTL the bidi algorithm reorders the operands around
 * the glyph but does not mirror the glyph itself, so an Arabic reader saw the
 * status transition running from the NEW state back to the OLD one. That is a
 * correctness bug, not a cosmetic one.
 *
 * They are interpolated rather than stripped so left-to-right output is
 * unchanged: `t('orders.statusTransition', { from, to, arrow: ARROW_FORWARD })`
 * still renders exactly the `→` it always did.
 */
export const ARROW_FORWARD = IS_RTL ? '←' : '→';
export const ARROW_BACK = IS_RTL ? '→' : '←';
