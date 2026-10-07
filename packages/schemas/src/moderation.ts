import { z } from 'zod';

// ============================================================================
// Moderation — reporting content, and blocking a person.
//
// SeamFlow publishes photographs to a feed anyone can read without an account,
// and lets two strangers exchange free text and images. That is user-generated
// content, and it carries an obligation: a person who sees something wrong has
// to be able to say so from inside the app, and a person being bothered has to
// be able to stop it themselves rather than wait for us.
//
// REPORTING IS REACTIVE, AND THAT IS A CHOICE
//
// Nothing is screened before it appears. A report is the signal, a human reads
// it, and the existing staff actions (take a post down, suspend an account) are
// the remedy. Reactive moderation is what a platform this size can actually
// staff, and a queue nobody reads would be worse than an honest one.
//
// BLOCKING IS SYMMETRIC, AND IT IS NOT A REPORT
//
// Blocking is private and immediate: no review, no staff, no notification to
// the other side. It stops messages in BOTH directions, because a block that
// only muted the incoming half would leave the blocker able to keep talking —
// which is not what anyone means by the word. Reporting is for us; blocking is
// for you, and neither implies the other.
// ============================================================================

/**
 * What is being reported.
 *
 * Three surfaces because there are three things a stranger can put in front of
 * you: a published design, the shop that published it, and a message in a
 * thread. Anything else (an order, an invoice) is between two people who
 * already have a relationship, and belongs in support, not here.
 */
export const ReportTargetSchema = z.enum(['design', 'shop', 'message']);
export type ReportTarget = z.infer<typeof ReportTargetSchema>;
export const REPORT_TARGETS = ReportTargetSchema.options;

/**
 * Why.
 *
 * `stolen_work` is first because it is the complaint this market actually
 * makes: the dominant fraud in fashion discovery is a shop publishing someone
 * else's photographs, which is the same thing verification exists to fight.
 * Giving it its own reason means the queue can be read at a glance, instead of
 * everything arriving as "other" with a paragraph attached.
 */
export const ReportReasonSchema = z.enum([
  'stolen_work',
  'sexual_content',
  'violence',
  'harassment',
  'scam',
  'spam',
  'other',
]);
export type ReportReason = z.infer<typeof ReportReasonSchema>;
export const REPORT_REASONS = ReportReasonSchema.options;

export const CreateReportSchema = z.object({
  target: ReportTargetSchema,
  /** The design's, shop's (tailor id) or message's id. */
  targetId: z.string().uuid(),
  reason: ReportReasonSchema,
  /**
   * Optional, and capped. A reporter who has something to add should be able
   * to, but a review queue is read by a person and an essay helps nobody.
   */
  note: z.string().trim().max(1000).optional(),
});
export type CreateReportInput = z.infer<typeof CreateReportSchema>;

/**
 * open      — nobody has looked yet
 * actioned  — we agreed and did something (took the post down, suspended)
 * dismissed — we looked and the content stays
 *
 * There is no "in progress": a queue this size is worked by one person at a
 * time, and a third state would only ever be left behind by accident.
 */
export const ReportStatusSchema = z.enum(['open', 'actioned', 'dismissed']);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const ContentReportSchema = z.object({
  id: z.string().uuid(),
  target: ReportTargetSchema,
  targetId: z.string().uuid(),
  reason: ReportReasonSchema,
  note: z.string().nullable(),
  status: ReportStatusSchema,
  createdAt: z.string(),
  reviewedAt: z.string().nullable(),
  decisionNote: z.string().nullable(),
  /** Who complained. Staff see this; the reported party never does. */
  reporter: z.object({
    userId: z.string().uuid(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  }),
  /**
   * Enough about the target to judge it without leaving the queue: a design's
   * image and caption, a shop's name, a message's text. Null when the target
   * has already been deleted, which is a valid outcome rather than an error.
   */
  subject: z
    .object({
      label: z.string(),
      detail: z.string().nullable(),
      imagePath: z.string().nullable(),
      /** The shop behind the content, so one click reaches the usual levers. */
      tailorId: z.string().uuid().nullable(),
      ownerUserId: z.string().uuid().nullable(),
    })
    .nullable(),
});
export type ContentReport = z.infer<typeof ContentReportSchema>;

export const DecideReportSchema = z.object({
  status: z.enum(['actioned', 'dismissed']),
  note: z.string().trim().max(1000).optional(),
});
export type DecideReportInput = z.infer<typeof DecideReportSchema>;

// ---------------------------------------------------------------------------
// Blocking
// ---------------------------------------------------------------------------

export const BlockedUserSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().nullable(),
  /** The shop name when the blocked person runs one — how they were met. */
  shopName: z.string().nullable(),
  /**
   * Their shop id, when they have one.
   *
   * Discover is a public, unauthenticated route, so the server does not know
   * who is looking and cannot filter a blocked shop out of it. The app does
   * that itself, and this is the key it matches on: feed posts carry a tailor
   * id, while a block is between two `users`.
   */
  tailorId: z.string().uuid().nullable(),
  avatarPath: z.string().nullable(),
  blockedAt: z.string(),
});
export type BlockedUser = z.infer<typeof BlockedUserSchema>;

export const CreateBlockSchema = z.object({
  userId: z.string().uuid(),
});
export type CreateBlockInput = z.infer<typeof CreateBlockSchema>;
