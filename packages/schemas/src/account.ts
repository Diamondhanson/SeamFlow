import { z } from 'zod';

/**
 * Account deletion contracts.
 *
 * Deletion is a request with a 30-day grace period, not an instant act. The
 * shape below is what both apps and the web route agree on.
 */

/** Days between asking and the purge becoming eligible to run. */
export const DELETION_GRACE_DAYS = 30;

/**
 * How recently the caller must have proved who they are before we accept a
 * deletion request. Long enough to fill in a confirmation form, short enough
 * that a phone left unlocked on a table is not enough to close a business.
 */
export const REAUTH_MAX_AGE_SECONDS = 5 * 60;

export const DeletionStateSchema = z.object({
  /** Null when the account is live. */
  requestedAt: z.string().nullable(),
  /** When the purge becomes eligible. Null when the account is live. */
  scheduledFor: z.string().nullable(),
  /** Whole days left to change their mind. Null when the account is live. */
  daysRemaining: z.number().int().nullable(),
});
export type DeletionState = z.infer<typeof DeletionStateSchema>;

export const RequestDeletionSchema = z.object({
  /**
   * Optional, free text, never required. Useful signal, but a person leaving
   * should not have to explain themselves to be allowed to go.
   */
  reason: z.string().max(1000).optional(),
});
export type RequestDeletionInput = z.infer<typeof RequestDeletionSchema>;

/**
 * Everything we hold on the caller, as one JSON document.
 *
 * Offered before deletion rather than after, because after is too late — and
 * because being shown what you are about to destroy is the most effective
 * guard against destroying it by accident.
 */
export const AccountExportSchema = z.object({
  exportedAt: z.string(),
  account: z.record(z.unknown()),
  tailor: z.record(z.unknown()).nullable(),
  clients: z.array(z.record(z.unknown())),
  orders: z.array(z.record(z.unknown())),
  invoices: z.array(z.record(z.unknown())),
  measurementTemplates: z.array(z.record(z.unknown())),
  fabrics: z.array(z.record(z.unknown())),
  designs: z.array(z.record(z.unknown())),
  requests: z.array(z.record(z.unknown())),
});
export type AccountExport = z.infer<typeof AccountExportSchema>;
