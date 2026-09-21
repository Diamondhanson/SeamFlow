import { z } from 'zod';

// ============================================================================
// Help & Support tickets — a user (tailor OR client) talking to SeamFlow.
//
// Deliberately NOT the customer↔tailor chat. A conversation there always has
// exactly one client and one tailor; a ticket has one user on one side and
// "SeamFlow" on the other, and it carries things a chat never does: a number
// people can quote, a status, and a category. Bending `conversations` to fit
// would put a nullable tailor on every chat query to serve a second product.
//
// Every ticket records which order it is about (optional) and which side of
// the app it came from, so a future customer-vs-tailor dispute can be built on
// top by adding the tailor as a participant — not by starting over.
// ============================================================================

export const SupportCategorySchema = z.enum(['app_problem', 'payment', 'account', 'order', 'other']);
export type SupportCategory = z.infer<typeof SupportCategorySchema>;
export const SUPPORT_CATEGORIES = SupportCategorySchema.options;

/**
 * open            — with SeamFlow; the user is waiting on us
 * waiting_on_user — SeamFlow replied and asked something back
 * resolved        — closed; any reply from the user reopens it
 */
export const SupportStatusSchema = z.enum(['open', 'waiting_on_user', 'resolved']);
export type SupportStatus = z.infer<typeof SupportStatusSchema>;

/** Which app the ticket was written from — decides where replies deep-link. */
export const SupportSideSchema = z.enum(['tailor', 'client']);
export type SupportSide = z.infer<typeof SupportSideSchema>;

export const SupportSenderSchema = z.enum(['user', 'support']);
export type SupportSender = z.infer<typeof SupportSenderSchema>;

/** A screenshot in the private `support-media` bucket, under `<userId>/`. */
export const SupportAttachmentSchema = z.object({
  storagePath: z.string().min(1),
  thumbnailPath: z.string().nullable().optional(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  /** Short-lived signed URLs, added by API responses — never stored. */
  url: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
});
export type SupportAttachment = z.infer<typeof SupportAttachmentSchema>;

export const SupportMessageSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string().uuid(),
  sender: SupportSenderSchema,
  body: z.string(),
  attachments: z.array(SupportAttachmentSchema),
  clientId: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type SupportMessage = z.infer<typeof SupportMessageSchema>;

export const SupportTicketSchema = z.object({
  id: z.string().uuid(),
  /** Sequential; shown as "SF-1042" (see formatTicketRef). */
  number: z.number().int(),
  side: SupportSideSchema,
  category: SupportCategorySchema,
  status: SupportStatusSchema,
  /** First line of the description — the ticket's title in lists. */
  subject: z.string(),
  orderId: z.string().uuid().nullable(),
  orderName: z.string().nullable(),
  lastMessageAt: z.string().datetime(),
  lastMessagePreview: z.string().nullable(),
  /** Replies from SeamFlow the user has not opened yet. */
  unread: z.number().int(),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
});
export type SupportTicket = z.infer<typeof SupportTicketSchema>;

export const SupportTicketDetailSchema = z.object({
  ticket: SupportTicketSchema,
  messages: z.array(SupportMessageSchema),
});
export type SupportTicketDetail = z.infer<typeof SupportTicketDetailSchema>;

const body = z.string().trim().max(4000);

export const SupportTicketCreateSchema = z.object({
  side: SupportSideSchema,
  category: SupportCategorySchema,
  body: body.min(10),
  attachments: z.array(SupportAttachmentSchema).max(5).optional(),
  orderId: z.string().uuid().nullable().optional(),
  /** Idempotency key minted on the device, so a retried submit can't duplicate. */
  clientId: z.string().min(8).max(64),
});
export type SupportTicketCreateInput = z.infer<typeof SupportTicketCreateSchema>;

export const SupportMessageCreateSchema = z
  .object({
    body: body.optional(),
    attachments: z.array(SupportAttachmentSchema).max(5).optional(),
    clientId: z.string().min(8).max(64),
  })
  .refine((m) => !!m.body || (m.attachments?.length ?? 0) > 0, {
    message: 'A reply needs text or a screenshot',
  });
export type SupportMessageCreateInput = z.infer<typeof SupportMessageCreateSchema>;

export const SupportStatusUpdateSchema = z.object({
  /** Users may only close their own ticket; reopening happens by replying. */
  status: z.literal('resolved'),
});
export type SupportStatusUpdateInput = z.infer<typeof SupportStatusUpdateSchema>;

/** "SF-1042" — what users quote and what support searches by. */
export function formatTicketRef(number: number): string {
  return `SF-${number}`;
}

// ── Staff side (admin inbox, plan step 2) ───────────────────────────────────

/** Who wrote in — shown beside the conversation in the inbox. */
export const SupportRequesterSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  businessName: z.string().nullable(),
  joinedAt: z.string().datetime(),
});
export type SupportRequester = z.infer<typeof SupportRequesterSchema>;

export const SupportStaffTicketDetailSchema = SupportTicketDetailSchema.extend({
  requester: SupportRequesterSchema,
});
export type SupportStaffTicketDetail = z.infer<typeof SupportStaffTicketDetailSchema>;

export const SupportStaffReplySchema = z.object({
  body: z.string().trim().min(1).max(4000),
  /**
   * Where the ticket stands after this reply. Usually "waiting on you" — we
   * answered, the ball is with them — but "resolved" lets a reply close it.
   */
  status: SupportStatusSchema.default('waiting_on_user'),
  clientId: z.string().min(8).max(64),
});
export type SupportStaffReplyInput = z.infer<typeof SupportStaffReplySchema>;

export const SupportStaffStatusSchema = z.object({ status: SupportStatusSchema });
export type SupportStaffStatusInput = z.infer<typeof SupportStaffStatusSchema>;
