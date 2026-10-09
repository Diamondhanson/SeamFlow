import { z } from 'zod';
import { FeedPostPublicSchema } from './feed';

// ============================================================================
// Saved designs.
//
// Commissioning a garment is a slow decision. Someone sees a piece, is not
// ready to message anyone about it, and wants to come back — and until now the
// only way to do that was a screenshot.
//
// The screenshot is the thing this replaces, and it is worth being clear about
// why that matters beyond convenience. A screenshot leaves with no shop
// attached, no way back to an enquiry, and no attribution at all — and a loose
// image with no attribution is exactly how stolen work travels, which is the
// fraud verification exists to fight. A save keeps the picture inside the app
// with the maker still on it.
//
// PRIVATE, AND WITH NO PUBLIC COUNT
//
// There is deliberately no "like". A public counter would put a new shop with
// nothing on it beside an established one and let the number decide — which
// punishes exactly the designers whose subscriptions pay for the platform, and
// in their first month. It is also cheap to forge, next to signals like reply
// time and completed orders that can only be earned by doing the work.
//
// What the maker gets instead is a count of their OWN design's saves, visible
// only to them. That is the useful half of a like — learning which work lands
// — without the popularity contest.
// ============================================================================

export const SavedDesignSchema = z.object({
  feedPostId: z.string().uuid(),
  savedAt: z.string(),
  /**
   * Null when the design is no longer public — unpublished by its maker, or
   * taken down by staff after a report.
   *
   * Kept as an entry rather than dropped silently, because the person saved it
   * for a reason and deserves to know it has gone rather than quietly finding
   * one fewer card than they remember. They can clear it themselves.
   */
  post: FeedPostPublicSchema.nullable(),
});
export type SavedDesign = z.infer<typeof SavedDesignSchema>;

export const SavedDesignPageSchema = z.object({
  items: z.array(SavedDesignSchema),
  nextCursor: z.string().nullable(),
});
export type SavedDesignPage = z.infer<typeof SavedDesignPageSchema>;
