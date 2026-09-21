import { redirect } from 'next/navigation';
import { getStaff } from '../../lib/auth';
import { supabaseServer } from '../../lib/supabase';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; failed?: string }>;
}) {
  const sp = await searchParams;

  // Already staff? Straight in.
  if (await getStaff()) redirect('/support');

  // Signed in, but not staff: sign them out here so the next attempt starts
  // clean, and say plainly why they were turned away.
  let notice: string | null = null;
  if (sp.denied) {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.auth.signOut();
      notice = `${data.user.email ?? 'That account'} is not on the SeamFlow staff list.`;
    }
  } else if (sp.failed) {
    notice = 'Google sign-in did not complete. Try again.';
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight">SeamFlow Ops</h1>
      <p className="mt-2 text-sm text-muted">Staff only. Sign in with the account on the staff list.</p>
      {notice ? (
        <p className="mt-6 border-l-2 border-bad pl-3 text-sm text-bad" role="alert">
          {notice}
        </p>
      ) : null}
      <LoginForm
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
        supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}
      />
    </main>
  );
}
