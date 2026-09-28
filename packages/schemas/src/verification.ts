import { z } from 'zod';

// ============================================================================
// Verification — a tailor asking SeamFlow to confirm their shop is real.
//
// The claim is narrow and checkable (appendix J.1):
//
//   "This is a real business, run by a reachable person, and the work in their
//    feed is their own."
//
// Not a judgement of skill. The dominant fraud in fashion discovery is stolen
// photos, and the risk to a client is concrete: they send body measurements,
// their address and their phone number to someone they found in a feed.
//
// THE ONE RULE, WHICH THIS FILE HAS TO KEEP
//
// Nothing here ever blocks anyone. A tailor who never submits keeps every
// feature they have, Discover included. That is why there is no "required"
// anything below, why every optional extra really is optional, and why the
// only precondition (a confirmed phone) gates SUBMITTING, not using the app.
// ============================================================================

/**
 * pending   — with SeamFlow, the tailor is waiting on us
 * approved  — badge granted; tailors.is_verified and verified_at are set
 * rejected  — declined with a reason they can act on; they may submit again
 * withdrawn — the tailor took it back before we looked
 */
export const VerificationStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'withdrawn',
]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

// ---------------------------------------------------------------------------
// Evidence
//
// A discriminated array rather than a column per kind. Phase 1 collects only
// `work_photo`; phase 3 adds the other three, and each has a different shape.
// The staff queue renders whatever it finds, so adding a kind later is a schema
// change and a card, not a migration.
// ---------------------------------------------------------------------------

/**
 * A photo taken with the CAMERA, in the private `verification-evidence` bucket
 * under `<userId>/`.
 *
 * The camera part is the whole point: either a garment in progress (on the
 * machine, on the cutting table) or a piece already in their feed re-shot from
 * a different angle with a handwritten note showing the shop name and date.
 * Someone who took the picture from Pinterest can produce neither.
 */
export const WorkPhotoEvidenceSchema = z.object({
  kind: z.literal('work_photo'),
  storagePath: z.string().min(1),
  /** When the camera took it, as the device reported. Advisory, not proof. */
  capturedAt: z.string().nullable().optional(),
});

/** Phase 3. Proves CONTROL of an account rather than its existence. */
export const SocialEvidenceSchema = z.object({
  kind: z.literal('social'),
  platform: z.enum(['instagram', 'facebook', 'tiktok']),
  handle: z.string().min(1),
  /** The short code we asked them to put in their bio for a day. */
  code: z.string().min(1),
  confirmedAt: z.string().nullable().optional(),
});

/**
 * Phase 3. ONE foreground fix, taken by the tailor while they stand in the
 * shop. Never background tracking — see J.7 for why that was rejected.
 *
 * `distanceM` is the gap between this fix and the address they typed, computed
 * server-side. Staff see the distance; a client is NEVER shown a coordinate,
 * because many tailors work from home.
 */
export const LocationEvidenceSchema = z.object({
  kind: z.literal('location'),
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().nullable().optional(),
  distanceM: z.number().nullable().optional(),
});

/** Phase 3. For the minority who have one; never required (J.9). */
export const RegistrationEvidenceSchema = z.object({
  kind: z.literal('registration'),
  number: z.string().min(1),
});

export const VerificationEvidenceSchema = z.discriminatedUnion('kind', [
  WorkPhotoEvidenceSchema,
  SocialEvidenceSchema,
  LocationEvidenceSchema,
  RegistrationEvidenceSchema,
]);
export type VerificationEvidence = z.infer<typeof VerificationEvidenceSchema>;

// ---------------------------------------------------------------------------
// The request
// ---------------------------------------------------------------------------

export const VerificationRequestSchema = z.object({
  id: z.string().uuid(),
  tailorId: z.string().uuid(),
  status: VerificationStatusSchema,
  evidence: z.array(VerificationEvidenceSchema),
  submittedAt: z.string(),
  decidedAt: z.string().nullable(),
  /** Shown to the tailor word for word when they were declined. */
  decisionNote: z.string().nullable(),
  /** True once the photos are past retention; the decision itself is kept. */
  evidencePurged: z.boolean(),
});
export type VerificationRequest = z.infer<typeof VerificationRequestSchema>;

export const VerificationSubmitSchema = z.object({
  /**
   * At least one piece. The server decides what is ENOUGH — phase 1 wants one
   * work photo — so that tightening the bar later is not a breaking client
   * change.
   */
  evidence: z.array(VerificationEvidenceSchema).min(1).max(8),
});
export type VerificationSubmitInput = z.infer<typeof VerificationSubmitSchema>;

/**
 * What the tailor's own screen reads.
 *
 * Carries the preconditions as DATA rather than making the app infer them, so
 * the screen can tick "phone confirmed" without a second round trip and can
 * explain precisely what is missing instead of refusing on submit.
 */
export const VerificationStateSchema = z.object({
  /** Their most recent request, whatever became of it. Null if never asked. */
  request: VerificationRequestSchema.nullable(),
  /** The badge as it stands right now. */
  isVerified: z.boolean(),
  verifiedAt: z.string().nullable(),
  /** Requirement one of two, already built: users.phone_verified_at. */
  phoneVerified: z.boolean(),
  /**
   * Whether the server could even run this: false when phone verification has
   * no provider configured, because requirement one would then be impossible.
   * The app hides the prompt rather than offering a dead end.
   */
  available: z.boolean(),
});
export type VerificationState = z.infer<typeof VerificationStateSchema>;

/**
 * What a client sees when they tap the badge (J.5).
 *
 * "A tick nobody can interrogate is decoration" — so this is the product, not
 * the tick. Trust signals (phase 2) join it here and need no tailor-facing UI.
 *
 * Contains NOTHING private: no phone number, no coordinate, no evidence.
 */
export const VerificationBadgeSchema = z.object({
  isVerified: z.boolean(),
  /** When SeamFlow confirmed the work. Null for badges predating appendix J. */
  verifiedAt: z.string().nullable(),
  phoneConfirmed: z.boolean(),
  memberSince: z.string().nullable(),
  /**
   * Trust signals (phase 2), carried here so the popover is one call.
   *
   * Shown ALONGSIDE the badge but never part of earning it — J.2 keeps the two
   * apart, because a shop verified on its first day has a badge and no history,
   * and that is the correct reading of both.
   */
  completedOrders: z.number().int().default(0),
  responseTimeHours: z.number().int().nullable().default(null),
});
export type VerificationBadge = z.infer<typeof VerificationBadgeSchema>;
