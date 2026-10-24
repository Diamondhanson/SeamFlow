import { Platform } from 'react-native';
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing env var ${name}. Add it to apps/seamflow-app/.env`);
  }
  return value;
}

/**
 * Deployed API — the fallback when the configured host can't work here.
 *
 * The custom domain, not the onrender.com hostname: some routers and DNS
 * filters refuse *.onrender.com outright, and a hostname we own can't be
 * blocked wholesale the way a shared-hosting one can. The onrender.com name
 * stays alive as the backup (see EXPO_PUBLIC_API_BACKUP_URL).
 */
const HOSTED_API = 'https://api.seamflowtech.com';

/**
 * Resolve the API base URL for the platform we're actually running on.
 *
 * `10.0.2.2` is the Android emulator's alias for the host machine. It is not a
 * real address: a desktop browser cannot resolve it, so a web build configured
 * that way fails every request with an opaque timeout and every screen sits on
 * its skeleton forever over data that exists.
 *
 * On web we therefore ignore an emulator address and use the deployed API.
 * Native keeps whatever `.env` says, so the emulator workflow is untouched.
 * Set EXPO_PUBLIC_WEB_API_URL to override — e.g. to point the browser at a
 * local API on localhost.
 *
 * The client app has carried this since its web build shipped; the tailor app
 * did not, which is why its local web export could not reach the API at all.
 */
function resolveApiUrl(): string {
  const configured = required('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL);
  if (Platform.OS !== 'web') return configured;

  const webOverride = process.env.EXPO_PUBLIC_WEB_API_URL;
  if (webOverride) return webOverride;

  const emulatorOnly = /\/\/10\.0\.2\.2(:|\/|$)/.test(configured);
  return emulatorOnly ? HOSTED_API : configured;
}

export const config = {
  apiUrl: resolveApiUrl(),
  // A second hostname for the SAME API, used only when apiUrl can't be reached
  // at all (lib/api-failover.ts). Empty = no failover, which is what local dev
  // wants. Never a different backend: both names must serve one service.
  apiBackupUrl: process.env.EXPO_PUBLIC_API_BACKUP_URL ?? '',
  // Marketing + legal site (roadmap 3.12). Optional — defaults to the public
  // domain so the in-app Privacy/Terms links work without extra setup.
  webUrl: process.env.EXPO_PUBLIC_WEB_URL || 'https://www.seamflowtech.com',
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
  // Google "Web" OAuth client ID (from Google Cloud Console). When set on a
  // native build with @react-native-google-signin installed, Google sign-in
  // uses the native in-app account picker (no browser). Empty → the app keeps
  // using the web/browser OAuth flow. Also the audience Supabase validates the
  // returned ID token against, so it must match the Supabase Google provider's
  // "Authorized Client IDs".
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  // Google "iOS" OAuth client ID. iOS will not open the native sheet with
  // only the web client: the module rejects inside configure() unless this
  // (or a GoogleService-Info.plist) is present. Android needs no equivalent.
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
};
