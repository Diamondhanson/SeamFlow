import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { config } from './config';

/**
 * Adapter that makes Supabase persist its session into the iOS Keychain /
 * Android Keystore via expo-secure-store. Survives app restarts and OS
 * unlock cycles.
 */
const SecureStoreAdapter = {
  getItem(key: string) {
    return SecureStore.getItemAsync(key);
  },
  setItem(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem(key: string) {
    return SecureStore.deleteItemAsync(key);
  },
};

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
