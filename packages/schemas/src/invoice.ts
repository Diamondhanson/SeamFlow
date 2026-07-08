import { z } from 'zod';
import { PublicTailorSchema } from './share-link';

export const InvoiceStatusSchema = z.enum(['draft', 'sent']);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

/** Where a line comes from — drives grouping/labels in the editor. */
export const InvoiceLineCategorySchema = z.enum([
  'garment',
  'workmanship',
  'fabric',
  'extra',
  'custom',
]);
export type InvoiceLineCategory = z.infer<typeof InvoiceLineCategorySchema>;

/** One editable line. `description` may be empty while the tailor is typing. */
export const InvoiceLineItemSchema = z.object({
  id: z.string().min(1),
  category: InvoiceLineCategorySchema,
  description: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;

/**
 * An invoice row as returned by the API. `deposit`/`total` are numbers (the
 * service converts the DB numeric strings); `total` is the subtotal
 * (Σ qty·unitPrice) and balance-due = total − deposit is derived at render.
 */
export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  tailorId: z.string().uuid(),
  orderId: z.string().uuid(),
  number: z.string(),
  status: InvoiceStatusSchema,
  currency: z.string().nullable(),
  lineItems: z.array(InvoiceLineItemSchema),
  deposit: z.number().nonnegative(),
  notes: z.string().nullable(),
  total: z.number().nonnegative(),
  issuedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

/** List rows carry the order name + client name for display. */
export const InvoiceWithContextSchema = InvoiceSchema.extend({
  orderName: z.string(),
  clientName: z.string().nullable(),
});
export type InvoiceWithContext = z.infer<typeof InvoiceWithContextSchema>;

/** Body for PATCH /invoices/:id — every field optional. */
export const InvoiceUpdateSchema = z.object({
  lineItems: z.array(InvoiceLineItemSchema).optional(),
  deposit: z.number().nonnegative().optional(),
  notes: z.string().nullable().optional(),
  status: InvoiceStatusSchema.optional(),
});
export type InvoiceUpdateInput = z.infer<typeof InvoiceUpdateSchema>;

/** Response from POST /orders/:id/invoice and POST /invoices/:id/link. */
export const InvoiceLinkResponseSchema = z.object({
  url: z.string().url(),
  token: z.string().min(1),
  expiresAt: z.string().datetime(),
});
export type InvoiceLinkResponse = z.infer<typeof InvoiceLinkResponseSchema>;

/** Response from GET /public/invoices/:token — client-facing, no auth. */
export const PublicInvoiceResponseSchema = z.object({
  number: z.string(),
  status: InvoiceStatusSchema,
  currency: z.string().nullable(),
  lineItems: z.array(InvoiceLineItemSchema),
  deposit: z.number().nonnegative(),
  total: z.number().nonnegative(),
  notes: z.string().nullable(),
  issuedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  order: z.object({ orderName: z.string() }),
  client: z.object({ fullName: z.string() }),
  tailor: PublicTailorSchema,
  effectiveExpiresAt: z.string().datetime(),
});
export type PublicInvoiceResponse = z.infer<typeof PublicInvoiceResponseSchema>;
