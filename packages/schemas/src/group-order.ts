import { z } from 'zod';
import { MeasurementValuesSchema } from './measurement';

export const GroupOrderStatusSchema = z.enum([
  'planning',
  'in_progress',
  'completed',
  'cancelled',
]);
export type GroupOrderStatus = z.infer<typeof GroupOrderStatusSchema>;

export const GroupOrderSchema = z.object({
  id: z.string().uuid(),
  tailorId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  sharedDesignNotes: z.string().nullable(),
  sharedFabricId: z.string().uuid().nullable(),
  ownerMemberId: z.string().uuid().nullable(),
  eventDate: z.string().datetime().nullable(),
  dateDelivery: z.string().datetime().nullable(),
  status: GroupOrderStatusSchema,
  totalAmount: z.string().nullable(),
  currency: z.string().length(3).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GroupOrder = z.infer<typeof GroupOrderSchema>;

export const GroupOrderMemberSchema = z.object({
  id: z.string().uuid(),
  groupOrderId: z.string().uuid(),
  clientId: z.string().uuid().nullable(),
  fullName: z.string().min(1),
  roleLabel: z.string().nullable(),
  measurements: MeasurementValuesSchema,
  notes: z.string().nullable(),
  position: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GroupOrderMember = z.infer<typeof GroupOrderMemberSchema>;

/** Group order with embedded members (returned by GET /group-orders/:id). */
export type GroupOrderWithMembers = GroupOrder & { members: GroupOrderMember[] };

/** Body schema for POST /group-orders. tailorId resolves from auth. */
export const GroupOrderCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  sharedDesignNotes: z.string().nullable().optional(),
  sharedFabricId: z.string().uuid().nullable().optional(),
  ownerMemberId: z.string().uuid().nullable().optional(),
  eventDate: z.string().datetime().nullable().optional(),
  dateDelivery: z.string().datetime().nullable().optional(),
  status: GroupOrderStatusSchema.optional(),
  totalAmount: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
});
export type GroupOrderCreateInput = z.infer<typeof GroupOrderCreateSchema>;

/** Body schema for PATCH /group-orders/:id. All fields optional. */
export const GroupOrderUpdateSchema = GroupOrderCreateSchema.partial();
export type GroupOrderUpdateInput = z.infer<typeof GroupOrderUpdateSchema>;

/** Body schema for POST /group-orders/:id/members. groupOrderId from path. */
export const GroupOrderMemberCreateSchema = z.object({
  fullName: z.string().min(1),
  clientId: z.string().uuid().nullable().optional(),
  roleLabel: z.string().nullable().optional(),
  measurements: MeasurementValuesSchema.optional(),
  notes: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});
export type GroupOrderMemberCreateInput = z.infer<typeof GroupOrderMemberCreateSchema>;

/** Body schema for PATCH /group-order-members/:id. All fields optional. */
export const GroupOrderMemberUpdateSchema = GroupOrderMemberCreateSchema.partial();
export type GroupOrderMemberUpdateInput = z.infer<typeof GroupOrderMemberUpdateSchema>;

/** Body schema for POST /group-order-members/:id/promote-to-client. */
export const PromoteMemberToClientSchema = z.object({
  phone: z.string().min(1),
  email: z.string().email().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type PromoteMemberToClientInput = z.infer<typeof PromoteMemberToClientSchema>;
