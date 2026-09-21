'use server';

import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase';

export async function signOut(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Email + password — the fallback for when Google sign-in is unavailable.
 * Runs on the server so the session lands in cookies the middleware can read.
 */
export async function signInWithPassword(
  _prev: { error: string | null },
  form: FormData,
): Promise<{ error: string | null }> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: 'Enter your email and password.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'That email and password did not match.' };
  redirect('/support');
}
