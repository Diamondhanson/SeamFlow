import type { Request } from 'express';
import type { UserRole } from '@seamflow/types';

export interface ProfileRow {
  id: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  fullName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthedUser {
  /** Supabase auth.users.id (also matches public.users.id) */
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  /** Row from public.users — null if DbService isn't configured */
  profile: ProfileRow | null;
  /** Raw JWT — pass into SupabaseService.withUserToken() for RLS-scoped DB calls */
  jwt: string;
}

export interface AuthedRequest extends Request {
  user: AuthedUser;
}
