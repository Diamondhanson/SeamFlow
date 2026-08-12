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
  /** What is being sewn. Every member inherits this unless they override it. */
  garmentType: z.string().nullable(),
  /** Measurement template every member is measured against by default. */
  templateId: z.string().uuid().nullable(),
  /** Legacy owner pointer (the member-row id); keep null on new groups. */
  ownerMemberId: z.string().uuid().nullable(),
  /** Canonical owner pointer — references clients(id). */
  ownerClientId: z.string().uuid().nullable(),
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
  /** Per-member override. NULL means inherit from the group order. */
  garmentType: z.string().nullable(),
  /** Per-member override. NULL means inherit from the group order. */
  templateId: z.string().uuid().nullable(),
  /** A snapshot for this event — never linked to the client's own saved sets. */
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
  garmentType: z.string().nullable().optional(),
  templateId: z.string().uuid().nullable().optional(),
  ownerMemberId: z.string().uuid().nullable().optional(),
  ownerClientId: z.string().uuid().nullable().optional(),
  eventDate: z.string().datetime().nullable().optional(),
  dateDelivery: z.string().datetime().nullable().optional(),
  status: GroupOrderStatusSchema.optional(),
  totalAmount: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
});
export type GroupOrderCreateInput = z.infer<typeof GroupOrderCreateSchema>;

// ============================================================================
// Atomic create-with-members: title + owner + members in one POST.
//
// The owner is one of two shapes:
//   { existingClientId: uuid }     — pick from the existing client list
//   { fullName, phone, address }   — create a new client inline
//
// The server runs all of (optional new-client create + group_order insert
// + member bulk insert) inside one transaction so the caller sees either
// the whole tree or nothing.
// ============================================================================

export const NewOwnerContactSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
});

export const GroupOrderOwnerInputSchema = z.union([
  z.object({ existingClientId: z.string().uuid() }),
  z.object({ newContact: NewOwnerContactSchema }),
]);
export type GroupOrderOwnerInput = z.infer<typeof GroupOrderOwnerInputSchema>;

export const GroupOrderMemberInlineSchema = z.object({
  fullName: z.string().min(1),
  roleLabel: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  /** Position is auto-assigned by the server if omitted. */
  position: z.number().int().nonnegative().optional(),
});
export type GroupOrderMemberInlineInput = z.infer<typeof GroupOrderMemberInlineSchema>;

export const GroupOrderWithMembersCreateSchema = z.object({
  name: z.string().min(1),
  owner: GroupOrderOwnerInputSchema,
  members: z.array(GroupOrderMemberInlineSchema).default([]),
  description: z.string().nullable().optional(),
  sharedDesignNotes: z.string().nullable().optional(),
  sharedFabricId: z.string().uuid().nullable().optional(),
  garmentType: z.string().nullable().optional(),
  templateId: z.string().uuid().nullable().optional(),
  eventDate: z.string().datetime().nullable().optional(),
  dateDelivery: z.string().datetime().nullable().optional(),
});
export type GroupOrderWithMembersCreateInput = z.infer<
  typeof GroupOrderWithMembersCreateSchema
>;

/** Body schema for PATCH /group-orders/:id. All fields optional. */
export const GroupOrderUpdateSchema = GroupOrderCreateSchema.partial();
export type GroupOrderUpdateInput = z.infer<typeof GroupOrderUpdateSchema>;

/** Body schema for POST /group-orders/:id/members. groupOrderId from path. */
export const GroupOrderMemberCreateSchema = z.object({
  fullName: z.string().min(1),
  clientId: z.string().uuid().nullable().optional(),
  roleLabel: z.string().nullable().optional(),
  /** Override the group's garment for this one member. Null/absent = inherit. */
  garmentType: z.string().nullable().optional(),
  templateId: z.string().uuid().nullable().optional(),
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

// ============================================================================
// Copying a client's saved measurements onto a group member.
//
// The old behaviour was one line of SQL — newest set, no questions asked — and
// it was wrong in a way nobody could see: a client whose most recent set was
// for trousers would have those numbers copied into a gown order under a
// green "Copied!" tick. Confidently wrong is worse than empty.
//
// So the copy now reports WHAT it used and HOW WELL it fit, and the app is
// expected to say so rather than claim success. `setId` lets the tailor
// override the pick entirely.
// ============================================================================

/** How well the copied set matched the garment being made. */
export const MeasurementMatchSchema = z.enum([
  /** Built from the very template this member is measured against. */
  'template',
  /** Different template, but it carries fields the target template asks for. */
  'overlap',
  /** No template to compare against — the tailor is flying blind either way. */
  'untargeted',
  /** Nothing in the client's records shares a single field with the target. */
  'none',
]);
export type MeasurementMatch = z.infer<typeof MeasurementMatchSchema>;

/** Body for POST /group-order-members/:id/copy-measurements-from-client. */
export const CopyMemberMeasurementsSchema = z.object({
  /** Copy this exact set. Omit to let the server pick the best match. */
  setId: z.string().uuid().nullable().optional(),
});
export type CopyMemberMeasurementsInput = z.infer<typeof CopyMemberMeasurementsSchema>;

export const MeasurementCopyResultSchema = z.object({
  member: GroupOrderMemberSchema,
  /** Null when the client has no saved sets at all — nothing was copied. */
  sourceSetId: z.string().uuid().nullable(),
  sourceSetLabel: z.string().nullable(),
  match: MeasurementMatchSchema,
  /** How many of the target template's fields the copied set actually filled. */
  matchedFields: z.number().int().nonnegative(),
  /** Fields the target template asks for. 0 when no template is resolved. */
  targetFields: z.number().int().nonnegative(),
});
export type MeasurementCopyResult = z.infer<typeof MeasurementCopyResultSchema>;

/**
 * Body for POST /group-order-members/:id/save-measurements-to-client.
 *
 * The reverse direction, and deliberately a separate explicit action: a
 * measurement taken for one event is a snapshot, and letting it quietly
 * overwrite the client's general record would make every fitting a
 * potential act of vandalism on next year's order.
 */
export const SaveMemberMeasurementsSchema = z.object({
  /** Defaults to the resolved garment, else the group order's name. */
  label: z.string().min(1).nullable().optional(),
});
export type SaveMemberMeasurementsInput = z.infer<typeof SaveMemberMeasurementsSchema>;
