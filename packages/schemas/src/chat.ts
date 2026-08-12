import { z } from 'zod';

// ============================================================================
// In-app chat between a consumer and a tailor (ROADMAP D.1.3 / D.1.4 / D.2.3).
//
// Deliberately NOT the tailor's AI copilot — different system, different
// screens. This is human ↔ human.
//
// Two design decisions run through everything here:
//
//  1. Role-relative shapes. The API resolves who the caller is and returns the
//     OTHER party as `counterparty`, plus `unreadCount` for the caller only.
//     Both apps then render the same component without either needing to know
//     which side of the table it's sitting on.
//
//  2. Client-generated ids. `clientId` is a UUID the sender mints before the
//     request leaves the device. It's what makes optimistic send and the
//     offline queue safe: the same queued message can be retried after a
//     timeout and the server de-duplicates on (conversationId, clientId),
//     returning the original rather than posting twice.
// ============================================================================

export const ConversationOriginSchema = z.enum([
  'inquiry',
  'order',
  /** A client's request that this tailor's offer won (ROADMAP appendix H). */
  'request',
]);
export type ConversationOrigin = z.infer<typeof ConversationOriginSchema>;

export const MessageSenderTypeSchema = z.enum(['client', 'tailor']);
export type MessageSenderType = z.infer<typeof MessageSenderTypeSchema>;

// ── Attachments ─────────────────────────────────────────────────────────────

/** An image in the private `chat-media` bucket; served via signed URL. */
export const MessageImageAttachmentSchema = z.object({
  kind: z.literal('image'),
  storagePath: z.string(),
  thumbnailPath: z.string().nullable().optional(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  /** Short-lived signed URLs, added by API responses — never stored. */
  url: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
});

/** A reference to a feed post — how "I'd like this one" is expressed. */
export const MessageDesignAttachmentSchema = z.object({
  kind: z.literal('design'),
  designPostId: z.string().uuid(),
  /** Stable public URL, resolved on read. */
  imageUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
});

export const MessageAttachmentSchema = z.discriminatedUnion('kind', [
  MessageImageAttachmentSchema,
  MessageDesignAttachmentSchema,
]);
export type MessageAttachment = z.infer<typeof MessageAttachmentSchema>;

// ── Messages ────────────────────────────────────────────────────────────────

export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderType: MessageSenderTypeSchema,
  senderUserId: z.string().uuid(),
  body: z.string().nullable(),
  attachments: z.array(MessageAttachmentSchema),
  /** Echoed back so an optimistic bubble can be reconciled with the real row. */
  clientId: z.string().nullable(),
  createdAt: z.string().datetime(),
  /** Set once the recipient has opened the thread. Drives the read tick. */
  readAt: z.string().datetime().nullable(),
});
export type Message = z.infer<typeof MessageSchema>;

export const MessageCreateSchema = z
  .object({
    body: z.string().max(4000).nullable().optional(),
    attachments: z.array(MessageAttachmentSchema).max(10).optional(),
    /** Mint this on the device before sending. See the note at the top. */
    clientId: z.string().min(8).max(64).optional(),
  })
  .refine(
    (m) => (m.body != null && m.body.trim().length > 0) || (m.attachments?.length ?? 0) > 0,
    { message: 'A message needs text or at least one attachment' },
  );
export type MessageCreateInput = z.infer<typeof MessageCreateSchema>;

/** Keyset page of messages, newest first. */
export const MessagePageSchema = z.object({
  items: z.array(MessageSchema),
  nextCursor: z.string().nullable(),
});
export type MessagePage = z.infer<typeof MessagePageSchema>;

// ── Conversations ───────────────────────────────────────────────────────────

/** The other party, resolved by the API from the caller's role. */
export const ConversationCounterpartySchema = z.object({
  /** Tailor id when the caller is a client; user id when the caller is a tailor. */
  id: z.string().uuid(),
  name: z.string(),
  avatarUrl: z.string().url().nullable(),
  isVerified: z.boolean().optional(),
});
export type ConversationCounterparty = z.infer<typeof ConversationCounterpartySchema>;

/** The design that started the thread, pinned at the top of the conversation. */
export const ConversationDesignSchema = z.object({
  id: z.string().uuid(),
  thumbnailUrl: z.string().url(),
  caption: z.string().nullable(),
  garmentType: z.string().nullable(),
});

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  origin: ConversationOriginSchema,
  counterparty: ConversationCounterpartySchema,
  design: ConversationDesignSchema.nullable(),
  /** Set once the thread has become a commission. */
  orderId: z.string().uuid().nullable(),
  lastMessageAt: z.string().datetime(),
  lastMessagePreview: z.string().nullable(),
  /** Unread count for the CALLER only — never the other side's. */
  unreadCount: z.number().int(),
  createdAt: z.string().datetime(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const ConversationListSchema = z.object({
  items: z.array(ConversationSchema),
  nextCursor: z.string().nullable(),
  /** Sum of unread across all threads — drives the tab badge in one number. */
  totalUnread: z.number().int(),
});
export type ConversationList = z.infer<typeof ConversationListSchema>;

/** Body for POST /conversations — the client-side "Inquire" action. */
export const ConversationCreateSchema = z.object({
  tailorId: z.string().uuid(),
  designPostId: z.string().uuid().nullable().optional(),
  firstMessage: z.string().min(1).max(4000),
  clientId: z.string().min(8).max(64).optional(),
});
export type ConversationCreateInput = z.infer<typeof ConversationCreateSchema>;

/** GET /conversations/:id — header plus the first page of messages. */
export const ConversationDetailSchema = z.object({
  conversation: ConversationSchema,
  messages: MessagePageSchema,
});
export type ConversationDetail = z.infer<typeof ConversationDetailSchema>;

// ── Quote (D.2.3 / phase C3) ────────────────────────────────────────────────

/**
 * Body for POST /conversations/:id/quote — the tailor turning a thread into
 * real work. Creates the client record from the inquiry when they're new.
 */
export const ConversationQuoteSchema = z.object({
  orderName: z.string().min(1).max(120),
  dateDelivery: z.string().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  /** Optional first invoice line, so a quote can carry a price immediately. */
  amount: z.string().nullable().optional(),
  /** Falls back to the tailor's own currency. */
  currency: z.string().length(3).nullable().optional(),
  /** Name to use if the inquiring client isn't in the tailor's book yet. */
  clientName: z.string().min(1).max(120).optional(),
  clientPhone: z.string().max(40).nullable().optional(),
});
export type ConversationQuoteInput = z.infer<typeof ConversationQuoteSchema>;

export const ConversationQuoteResultSchema = z.object({
  conversationId: z.string().uuid(),
  orderId: z.string().uuid(),
  invoiceId: z.string().uuid().nullable(),
  clientId: z.string().uuid(),
});
export type ConversationQuoteResult = z.infer<typeof ConversationQuoteResultSchema>;

// ── Ephemeral realtime payloads (not persisted) ─────────────────────────────

/**
 * Broadcast on the per-conversation Realtime channel. Typing state is
 * deliberately never written to the database — it's worthless a second later,
 * and a write per keystroke would be a self-inflicted denial of service.
 */
export const TypingEventSchema = z.object({
  conversationId: z.string().uuid(),
  senderType: MessageSenderTypeSchema,
  isTyping: z.boolean(),
  at: z.number().int(),
});
export type TypingEvent = z.infer<typeof TypingEventSchema>;
