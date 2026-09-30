'use server';

// ============================================================================
// Second factor (TOTP authenticator app) for staff.
//
// Runs on the server so the upgraded session (aal2) lands in the same cookies
// the middleware and requireStaff() read. Only a signed-in STAFF member may use
// these: anyone else has no business enrolling a factor here.
// ============================================================================

import { redirect } from 'next/navigation';
import { getStaff } from './auth';
import { supabaseServer } from './supabase';

export type MfaStart =
  | { mode: 'verify'; factorId: string }
  | { mode: 'enroll'; factorId: string; qrCode: string; secret: string }
  | { mode: 'error'; message: string };

/** What /mfa should show: a code prompt, or first-time setup with a QR code. */
export async function startMfa(): Promise<MfaStart> {
  const staff = await getStaff();
  if (!staff) redirect('/login?denied=1');
  if (staff.mfaPassed) redirect('/support');

  const supabase = await supabaseServer();
  const { data: factors, error } = await supabase.auth.mfa.listFactors();
  if (error) return { mode: 'error', message: error.message };

  const verified = factors.totp.find((f) => f.status === 'verified');
  if (verified) return { mode: 'verify', factorId: verified.id };

  // A setup that was started and abandoned leaves an unverified factor behind;
  // clear it, or Supabase refuses a second one with the same name.
  for (const f of factors.all) {
    if (f.factor_type === 'totp' && f.status !== 'verified') {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }
  const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'SeamFlow Ops',
  });
  if (enrollError || !enrolled) {
    return { mode: 'error', message: enrollError?.message ?? 'Could not start setup.' };
  }
  return {
    mode: 'enroll',
    factorId: enrolled.id,
    qrCode: enrolled.totp.qr_code,
    secret: enrolled.totp.secret,
  };
}

/** Check the 6-digit code. On success the session is aal2 and we go in. */
export async function verifyMfa(
  _prev: { error: string | null },
  form: FormData,
): Promise<{ error: string | null }> {
  const staff = await getStaff();
  if (!staff) redirect('/login?denied=1');

  const factorId = String(form.get('factorId') ?? '');
  const code = String(form.get('code') ?? '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return { error: 'Enter the 6-digit code from your authenticator app.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: 'That code did not match. Codes change every 30 seconds — try the current one.' };
  redirect('/support');
}
