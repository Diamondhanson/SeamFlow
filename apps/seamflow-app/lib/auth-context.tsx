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

/** Thrown when the user cancels the native "Sign in with Apple" sheet. */
export class AppleCancelledError extends Error {
  constructor() {
    super('Apple sign-in cancelled');
    this.name = 'AppleCancelledError';
  }
}

/**
 * Master switch for Apple Sign-In. Stays `false` until all three are done — see
 * docs/apple-sign-in.md for the exact steps:
 *   1. Apple Developer — an App ID with the "Sign in with Apple" capability, a
 *      Services ID, and a .p8 key (Key ID + Team ID).
 *   2. Supabase — the Apple provider enabled with those client IDs + secret.
 *   3. A native rebuild that includes `ios.usesAppleSignIn` (the entitlement).
 *
 * While `false`, the sign-in screen shows a "coming soon" dialog and never
 * invokes signInWithApple(), so the button is safe to ship on the current
 * dev client without a rebuild.
 */
export const APPLE_SIGN_IN_ENABLED = false;

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
  /**
   * Native "Sign in with Apple" → Supabase (signInWithIdToken). Only works once
   * APPLE_SIGN_IN_ENABLED is true, the Apple provider is configured in Supabase,
   * and the app has been rebuilt with the `usesAppleSignIn` entitlement. Throws
   * AppleCancelledError if the user dismisses the native sheet.
   */
  signInWithApple: () => Promise<void>;
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

  const signInWithApple = useCallback(async () => {
    // Lazy-require the native modules so they are only resolved when this flow
    // actually runs (i.e. after APPLE_SIGN_IN_ENABLED is flipped AND the app is
    // rebuilt with the Apple entitlement). A top-level `import` would call
    // requireNativeModule() at load time and crash any dev client built before
    // the entitlement existed — which would break the whole app, not just Apple.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AppleAuthentication = require('expo-apple-authentication');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Crypto = require('expo-crypto');

    // Supabase checks an anti-replay nonce: we send Apple the SHA-256 of a random
    // string and hand the raw string to Supabase to match against the hash baked
    // into the returned identity token.
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    const rawNonce = Array.from(randomBytes as Uint8Array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    let credential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
    } catch (e) {
      // Apple throws ERR_REQUEST_CANCELED when the user taps Cancel.
      if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') {
        throw new AppleCancelledError();
      }
      throw e;
    }

    const idToken = credential.identityToken;
    if (!idToken) throw new Error('Apple did not return an identity token');

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: idToken,
      nonce: rawNonce,
    });
    if (error) throw error;

    // Apple only returns the user's name on the VERY FIRST authorization. Stash
    // it in auth metadata if present so the profile-setup screen can prefill it.
    // (The identity token itself carries no name, so the profile-provisioning DB
    // trigger can't see it — this is the only chance to capture it.)
    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (fullName) {
      await supabase.auth.updateUser({ data: { full_name: fullName } });
    }
    // The auth-state listener catches SIGNED_IN and updates `session`.
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
      signInWithApple,
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
      signInWithApple,
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
