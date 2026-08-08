import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'tailor',
  'tailor_staff',
  'client',
  'admin',
]);

export const measurementUnitEnum = pgEnum('measurement_unit', ['cm', 'in']);

export const orderStatusEnum = pgEnum('order_status', [
  'registered',
  'in_progress',
  'testing',
  'on_pause',
  'delivered',
]);

export const groupOrderStatusEnum = pgEnum('group_order_status', [
  'planning',
  'in_progress',
  'completed',
  'cancelled',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'succeeded',
  'failed',
  'refunded',
]);

export const paymentProviderEnum = pgEnum('payment_provider', [
  'stripe',
  'paystack',
  'flutterwave',
  'razorpay',
]);

export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent']);

// ── Discovery feed + chat (ROADMAP Appendix D) ──────────────────────────────

/** 'hidden' = tailor unpublished it; 'removed' = taken down by moderation. */
export const feedPostStatusEnum = pgEnum('feed_post_status', [
  'published',
  'hidden',
  'removed',
]);

export const conversationOriginEnum = pgEnum('conversation_origin', [
  'inquiry',
  'order',
]);

export const messageSenderTypeEnum = pgEnum('message_sender_type', [
  'client',
  'tailor',
]);

// ── My Designs: the tailor's own finished work (ROADMAP: "My Designs") ──────
// Structured rather than free text so filters stay reliable across tailors.

export const workAudienceEnum = pgEnum('work_audience', [
  'women',
  'men',
  'unisex',
  'children',
]);

export const workOccasionEnum = pgEnum('work_occasion', [
  'wedding',
  'traditional',
  'corporate',
  'casual',
  'party',
]);

/** Where the piece came from: uploaded directly, or adopted from an order photo. */
export const workSourceEnum = pgEnum('work_source', ['upload', 'order_photo']);

// ── Phone verification (migration 20260808200000) ───────────────────────────
/**
 * Delivery route for a phone OTP. WhatsApp is the intended default; SMS exists
 * because a number without a WhatsApp account can't receive the first, and we
 * need to record which route an attempt actually took.
 */
export const otpChannelEnum = pgEnum('otp_channel', ['whatsapp', 'sms']);
