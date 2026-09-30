// ============================================================================
// requireStaff() — the gate in front of every page and every write.
//
// Three checks, in order:
//   1. a valid Supabase session (verified with Supabase, not just decoded)
//   2. that user is on the `staff` table
//   3. the session passed a second factor (authenticator app code, "aal2")
//
// A password or a Google account alone is not enough to reach production data:
// staff who haven't done step 3 yet are sent to /mfa, which enrolls them the
// first time and asks for a code every time after.
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
  /** True once this session has passed the second factor. */
  mfaPassed: boolean;
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
  const accessToken = session.session?.access_token ?? '';
  // Read from the same token getUser() just verified with Supabase.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(accessToken);
  return {
    userId: data.user.id,
    email: data.user.email ?? '',
    accessToken,
    mfaPassed: aal?.currentLevel === 'aal2',
  };
}

/** Staff, second factor passed. The gate for every page and every write. */
export async function requireStaff(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect('/login?denied=1');
  if (!staff.mfaPassed) redirect('/mfa');
  return staff;
}
