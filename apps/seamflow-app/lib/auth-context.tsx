import type { AuthError, Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { ensurePushRegistered, unregisterPushOnSignOut } from './notifications';
import { clearPin } from './pin-lock';

// Required so the in-app browser hands control back to the JS runtime on web
// (no-op on native) when the auth session completes. Safe to call at module
// load.
WebBrowser.maybeCompleteAuthSession();

/**
 * Thrown by signInWithPassword when the account exists but its email is
 * still unconfirmed. Callers (the sign-in screen) catch this specifically
 * and route the user to the OTP verify screen rather than showing a raw
 * "Email not confirmed" error.
 */
export class EmailNotConfirmedError extends Error {
  readonly email: string;
  constructor(email: string) {
    super('Email not confirmed');
    this.name = 'EmailNotConfirmedError';
    this.email = email;
  }
}

/** Thrown when the user dismisses the in-app browser without finishing. */
export class GoogleCancelledError extends Error {
  constructor() {
    super('Google sign-in cancelled');
    this.name = 'GoogleCancelledError';
  }
}

interface AuthState {
  session: Session | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  /**
   * Creates the account and triggers Supabase to send a 6-digit OTP to the
   * email. The session is NOT created yet — the user has to call
   * verifyOtpSignup() with the code before they're signed in. Throws on
   * already-existing-email or other validation errors.
   */
  signUpWithPassword: (email: string, password: string) => Promise<void>;
  /** Verify the 6-digit signup OTP. On success, session is created. */
  verifyOtpSignup: (email: string, token: string) => Promise<void>;
  /** Re-send the signup OTP. Rate-limited by Supabase server-side. */
  resendSignupOtp: (email: string) => Promise<void>;
  /**
   * Launch the Google OAuth flow in an in-app browser. Resolves once the
   * user is signed in (the session listener picks up the new state).
   * Throws GoogleCancelledError if the user dismissed the browser.
   */
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const sub = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      // Register push on every sign-in (including refresh-on-restart).
      // ensurePushRegistered() is idempotent and never throws.
      if (newSession && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        void ensurePushRegistered();
      }
      if (event === 'SIGNED_OUT') {
        void unregisterPushOnSignOut();
        // Clear the device PIN on sign-out. PINs live in the OS keychain
        // which is shared across user accounts on the same install — if
        // we kept it around, the next person to sign in would inherit
        // (and be locked behind) the previous user's PIN.
        void clearPin();
      }
    });
    unsub = () => sub.data.subscription.unsubscribe();

    return () => unsub?.();
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (isEmailNotConfirmed(error)) {
        throw new EmailNotConfirmedError(email);
      }
      throw error;
    }
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // When email confirmation is required (our setting), `session` comes
    // back null and `user.identities` is empty if the email is already
    // taken. Supabase doesn't surface that as an error to avoid leaking
    // account existence — we mirror that here (no special path) and the
    // user just won't receive an OTP for an account they can't claim.
    if (data.session) {
      // If email confirmation is disabled in the dashboard the session is
      // returned immediately — supported but not the path we want. Sign
      // them in directly in that case.
      return;
    }
  }, []);

  const verifyOtpSignup = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if (error) throw error;
  }, []);

  const resendSignupOtp = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({ email, type: 'signup' });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    // Deep link the OAuth provider will redirect back to. `Linking.createURL`
    // resolves to:
    //   - Expo Go dev:  exp://<lan-ip>:8081/--/auth/callback
    //   - Standalone:   <app-scheme>://auth/callback
    // Both need to be in Supabase Auth → URL Configuration → Redirect URLs.
    const redirectTo = Linking.createURL('auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        // We open the browser ourselves; don't let supabase-js try to do it.
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('No OAuth URL returned by Supabase');

    // Opens an in-app SFAuthenticationSession (iOS) / Custom Tab (Android).
    // Waits until the browser navigates to `redirectTo`, then closes and
    // returns the redirected URL with the auth code embedded.
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new GoogleCancelledError();
    }
    if (result.type !== 'success' || !result.url) {
      throw new Error('Google sign-in did not complete');
    }

    // Pull the `code` query param out of the redirect URL and exchange it
    // for a session. supabase-js automatically retrieves the matching PKCE
    // verifier it stashed in SecureStore during signInWithOAuth().
    const url = new URL(result.url);
    const code = url.searchParams.get('code');
    if (!code) {
      // Some providers return tokens in the URL hash instead of `code`.
      // Supabase normalises that for us, but if neither is present the
      // flow is genuinely broken — surface a clear error.
      throw new Error('Google did not return an auth code');
    }
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    // The auth-state listener in this provider catches the SIGNED_IN event
    // and updates `session` — caller doesn't need to do anything else.
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      signInWithPassword,
      signUpWithPassword,
      verifyOtpSignup,
      resendSignupOtp,
      signInWithGoogle,
      signOut,
    }),
    [
      session,
      loading,
      signInWithPassword,
      signUpWithPassword,
      verifyOtpSignup,
      resendSignupOtp,
      signInWithGoogle,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/**
 * Supabase reports this with several shapes across versions:
 *   - error.code === 'email_not_confirmed' (v2.45+)
 *   - error.message === 'Email not confirmed' (older)
 * Be liberal in what we accept so the OTP-verify route catches both.
 */
function isEmailNotConfirmed(error: AuthError): boolean {
  if (error.code === 'email_not_confirmed') return true;
  return /email not confirmed/i.test(error.message);
}
