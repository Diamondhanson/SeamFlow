import { z } from 'zod';

/**
 * The notification inbox — shared by both apps.
 *
 * Note what the wire format does NOT carry: a rendered title or body. The API
 * sends `type` + `params` and each app renders `t('notifications.' + type,
 * params)`. That keeps EN/FR parity (which a lint guard enforces here) and lets
 * a notification re-render correctly after the thing it describes is renamed.
 */

/**
 * Every notification type, in one place.
 *
 * Adding one means: a case here, an `en` + `fr` key in BOTH apps' locale files,
 * and a call to `notifications.emit(...)`. Keeping the union closed is what
 * makes a missing translation a compile/lint error instead of a blank row in
 * someone's inbox.
 *
 * Deliberately absent — these are pushed but never stored:
 *   chat.message   the conversation list is already their inbox
 *   order.due      a STATE, already a chip on the orders list
 */
export const NotificationTypeSchema = z.enum([
  // ── to the client ────────────────────────────────────────────────────────
  'quote.received',
  'invoice.issued',
  'payment.confirmed',
  'order.ready_for_fitting',
  'order.ready_for_pickup',
  'order.delivered',
  'order.delivery_date_moved',
  'order.cancelled_by_tailor',

  // ── to the tailor ────────────────────────────────────────────────────────
  'enquiry.received',
  'quote.accepted',
  'quote.declined',
  'payment.received',
  'order.claimed',

  // ── either side ──────────────────────────────────────────────────────────
  'security.new_device',
  'security.phone_verified',
  'moderation.outcome',

  // Requests & offers (appendix H). A tailor who writes a considered offer and
  // hears nothing back stops answering the board, so the DECLINE is notified
  // as deliberately as the win.
  'request.matched',
  'offer.received',
  'offer.accepted',
  'offer.declined',
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

/** What a notification points at, for deep-linking on tap. */
export const NotificationEntityTypeSchema = z.enum([
  'order',
  'conversation',
  'request',
  'offer',
  'invoice',
]);
export type NotificationEntityType = z.infer<typeof NotificationEntityTypeSchema>;

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  type: NotificationTypeSchema,
  /**
   * Interpolation values for the translated string.
   *
   * Carries a DISPLAY SNAPSHOT (e.g. the order name as it read when the event
   * happened) so the row still reads sensibly after the entity is deleted —
   * only the tap target goes away, not the text.
   *
   * Strings and numbers only. A boolean interpolates to "true"/"false", which
   * is never the right thing to show in either language — if a notification
   * varies by a flag, that's two `type`s, not one type with a boolean.
   */
  params: z.record(z.union([z.string(), z.number()])),
  entityType: NotificationEntityTypeSchema.nullable(),
  entityId: z.string().uuid().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationPageSchema = z.object({
  items: z.array(NotificationSchema),
  nextCursor: z.string().nullable(),
  /** Unread total, so the badge doesn't need a second round trip. */
  unreadCount: z.number().int().nonnegative(),
});
export type NotificationPage = z.infer<typeof NotificationPageSchema>;

export const NotificationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});
export type NotificationQuery = z.infer<typeof NotificationQuerySchema>;

export const NotificationSettingsSchema = z.object({
  /** Opt-OUT list, so new types ship live without a backfill. */
  mutedTypes: z.array(NotificationTypeSchema),
});
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;
