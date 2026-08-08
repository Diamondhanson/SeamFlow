import { Platform } from 'react-native';

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing env var ${name}. Add it to apps/seamflow-client/.env`);
  }
  return value;
}

/** Deployed API — the fallback when the configured host can't work here. */
const HOSTED_API = 'https://seamflow-api.onrender.com';

/**
 * Resolve the API base URL for the platform we're actually running on.
 *
 * `10.0.2.2` is the Android emulator's alias for the host machine. It is not a
 * real address: a desktop browser can't resolve it, so a web build configured
 * that way fails every request with an opaque network error and every screen
 * renders its empty state over data that exists.
 *
 * On web we therefore ignore an emulator address and use the deployed API.
 * Native keeps whatever `.env` says, so the emulator workflow is untouched.
 * Set EXPO_PUBLIC_WEB_API_URL to override (e.g. to point the browser at a local
 * API on localhost).
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
  // Marketing + legal site (roadmap 3.12). Optional — defaults to the public
  // domain so the in-app Privacy/Terms links work without extra setup.
  webUrl: process.env.EXPO_PUBLIC_WEB_URL || 'https://www.seamflowtech.com',
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
};
