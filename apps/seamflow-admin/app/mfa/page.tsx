import { startMfa } from '../../lib/mfa-actions';
import { signOut } from '../../lib/session-actions';
import { MfaForm } from './mfa-form';

export const dynamic = 'force-dynamic';

export default async function MfaPage() {
  // Redirects away when signed out, not staff, or already verified.
  const start = await startMfa();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight">Two-step sign-in</h1>

      {start.mode === 'error' ? (
        <p className="mt-6 border-l-2 border-bad pl-3 text-sm text-bad" role="alert">
          {start.message}
        </p>
      ) : start.mode === 'enroll' ? (
        <>
          <p className="mt-2 text-sm text-muted">
            One-time setup. Scan this with an authenticator app (Google Authenticator, 1Password,
            Authy…), then enter the 6-digit code it shows.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- a data: URL from Supabase */}
          <img src={start.qrCode} alt="QR code for your authenticator app" className="mt-6 h-48 w-48 bg-white p-2" />
          <p className="mt-3 text-2xs text-faint">
            Can’t scan? Enter this key by hand: <code className="select-all break-all">{start.secret}</code>
          </p>
          <MfaForm factorId={start.factorId} />
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">Enter the 6-digit code from your authenticator app.</p>
          <MfaForm factorId={start.factorId} />
        </>
      )}

      <form action={signOut} className="mt-8">
        <button type="submit" className="text-xs text-faint underline-offset-2 hover:underline">
          Sign out
        </button>
      </form>
    </main>
  );
}
