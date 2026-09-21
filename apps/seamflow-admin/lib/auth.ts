// ============================================================================
// requireStaff() — the gate in front of every page and every write.
//
// Two checks, in order:
//   1. a valid Supabase session (verified with Supabase, not just decoded)
//   2. that user is on the `staff` table
//
// Middleware already turns away anyone without a session, but it cannot see
// the database, so the staff check lives here and runs on every page render
// (via the (ops) layout) and inside every server action. A server action is a
// public POST endpoint; a layout does not protect it.
// ============================================================================

import { redirect } from 'next/navigation';
import { sql } from './db';
import { supabaseServer } from './supabase';

export interface Staff {
  userId: string;
  email: string;
  /** For calling the API as this person (inbox replies). */
  accessToken: string;
}

export async function getStaff(): Promise<Staff | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const rows = await sql<{ user_id: string }[]>`
    select user_id from staff where user_id = ${data.user.id} limit 1
  `;
  if (!rows[0]) return null;
  const { data: session } = await supabase.auth.getSession();
  return {
    userId: data.user.id,
    email: data.user.email ?? '',
    accessToken: session.session?.access_token ?? '',
  };
}

export async function requireStaff(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect('/login?denied=1');
  return staff;
}
