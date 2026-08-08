import { z } from 'zod';

/**
 * Phone verification (WhatsApp-first).
 *
 * Note what is NOT here: the code length, TTL, and attempt limits are the
 * server's business and deliberately absent from the contract, so tightening
 * them later isn't a breaking client change. The client renders whatever
 * `ttlMinutes` comes back.
 */

export const OtpChannelSchema = z.enum(['whatsapp', 'sms']);
export type OtpChannel = z.infer<typeof OtpChannelSchema>;

export const PhoneVerifyStartSchema = z.object({
  /**
   * As typed by the user — the server normalises to E.164. Accepting raw input
   * means a Cameroonian typing "6 77 12 34 56" works without the app having to
   * reimplement parsing.
   */
  phone: z.string().min(4).max(32),
  /** Interpret a local-format number against this country. ISO-3166 alpha-2. */
  defaultCountry: z.string().length(2).optional(),
  /** Template language, where the provider supports localised templates. */
  locale: z.enum(['en', 'fr']).optional(),
  /** Defaults to WhatsApp; SMS is the fallback for numbers without WhatsApp. */
  channel: OtpChannelSchema.optional(),
});
export type PhoneVerifyStartInput = z.infer<typeof PhoneVerifyStartSchema>;

export const PhoneVerifyStartResultSchema = z.object({
  /** Normalised E.164, echoed so the UI can show what we actually messaged. */
  phone: z.string(),
  channel: OtpChannelSchema,
  expiresAt: z.string(),
  ttlMinutes: z.number().int().positive(),
});
export type PhoneVerifyStartResult = z.infer<typeof PhoneVerifyStartResultSchema>;

export const PhoneVerifyConfirmSchema = z.object({
  code: z.string().min(4).max(10),
});
export type PhoneVerifyConfirmInput = z.infer<typeof PhoneVerifyConfirmSchema>;

export const PhoneVerifyStatusSchema = z.object({
  phone: z.string().nullable(),
  verified: z.boolean(),
  /**
   * False when the server has no OTP provider configured. The client uses this
   * to hide or disable the entry point rather than letting a user start a flow
   * that can only 503.
   */
  enabled: z.boolean(),
});
export type PhoneVerifyStatus = z.infer<typeof PhoneVerifyStatusSchema>;
