// ============================================================================
// Native Google Sign-In (the in-app account-picker sheet) → an ID token.
//
// This is the "small in-app dialog" flow: Google Identity Services / Android
// Credential Manager renders Google's own native account picker, hands us an ID
// token, and we exchange it with Supabase via signInWithIdToken — exactly like
// the Apple flow. No browser, no redirect.
//
// Requires the native module (@react-native-google-signin/google-signin),
// installed for native builds only. It is loaded lazily via `require` so:
//   - this file compiles before the package is installed (see the ts-ignore),
//   - and the WEB bundle uses google-native.web.ts instead and never sees it.
// ============================================================================

/** Thrown when the user dismisses the native account sheet. */
export class GoogleCancelled extends Error {
  constructor() {
    super('google-sign-in-cancelled');
    this.name = 'GoogleCancelled';
  }
}

// Loose types on purpose — the real ones arrive with the installed package, and
// this wrapper only touches these three methods.
interface GoogleSigninModule {
  configure(opts: { webClientId: string; offlineAccess?: boolean }): void;
  hasPlayServices(opts?: { showPlayServicesUpdateDialog?: boolean }): Promise<boolean>;
  signIn(): Promise<unknown>;
}

let mod: { GoogleSignin: GoogleSigninModule; statusCodes: Record<string, string> } | null = null;

function load() {
  if (!mod) {
    // Metro needs a literal require to bundle the native module; the ts-ignore
    // (which must sit directly above the require) keeps this from erroring
    // before the package is installed.
    // @ts-ignore optional native dependency, present only in native builds
    mod = require('@react-native-google-signin/google-signin'); // eslint-disable-line @typescript-eslint/no-require-imports
  }
  return mod!;
}

let configured = false;

/**
 * Open the native Google account picker and return a Google ID token.
 * Throws GoogleCancelled if the user dismisses it.
 */
export async function nativeGoogleIdToken(webClientId: string): Promise<string> {
  const { GoogleSignin, statusCodes } = load();
  if (!configured) {
    GoogleSignin.configure({ webClientId });
    configured = true;
  }
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  try {
    // v13+ returns { type: 'success' | 'cancelled', data?: { idToken } }; older
    // versions return the userInfo with idToken at the top level. Handle both.
    const res = (await GoogleSignin.signIn()) as {
      type?: string;
      data?: { idToken?: string | null };
      idToken?: string | null;
    };
    if (res?.type === 'cancelled') throw new GoogleCancelled();
    const idToken = res?.data?.idToken ?? res?.idToken ?? null;
    if (!idToken) throw new Error('Google returned no ID token');
    return idToken;
  } catch (e) {
    if (e instanceof GoogleCancelled) throw e;
    const code = (e as { code?: string })?.code;
    if (code && statusCodes && code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleCancelled();
    }
    throw e;
  }
}
