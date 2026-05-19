import { z } from 'zod';

export const UserRoleSchema = z.enum(['tailor', 'tailor_staff', 'client', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  role: UserRoleSchema,
  fullName: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;
