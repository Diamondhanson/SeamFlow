import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { config } from './config';

/**
 * Session storage adapter.
 *
 * Native: the iOS Keychain / Android Keystore via expo-secure-store — survives
 * app restarts and OS unlock cycles.
 *
 * Web: expo-secure-store does NOT exist in the browser; calling it rejects,
 * which used to leave `getSession()` unresolved and hang the app on its splash
 * spinner forever. There we fall back to `localStorage` — weaker at rest, but
 * it's the standard browser session store and the only option. Every method is
 * defensive so a storage failure degrades to "signed out", never a hang.
 */
const isWeb = Platform.OS === 'web';

const webStorage = {
  async getItem(key: string) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Private mode / quota — session simply won't persist.
    }
  },
  async removeItem(key: string) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
  },
};

const nativeStorage = {
  async getItem(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // ignore — treated as a lost session, not a crash
    }
  },
  async removeItem(key: string) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },
};

const SecureStoreAdapter = isWeb ? webStorage : nativeStorage;

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter as unknown as Storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // PKCE is the correct OAuth flow for native apps — Supabase generates a
    // code verifier stored in `storage`, the OAuth provider returns a code
    // via the deep link, and `exchangeCodeForSession` swaps it for a real
    // session. Without this, the implicit flow tries to write tokens into
    // the URL fragment and won't survive the mobile redirect handoff.
    flowType: 'pkce',
  },
});

// Per Supabase's React Native guidance: run the token auto-refresh ticker
// only while the app is foregrounded, and kick it the moment we come back.
// Without this, a session that expired while backgrounded stays stale for a
// window after resume — the first API calls then 401 and (before the
// recovery flow) could cascade into a spurious sign-out that also wiped the
// user's PIN.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
