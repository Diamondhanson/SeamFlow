import { Platform } from 'react-native';
import { createApiClient } from '@seamflow/api-client';
import { createFailoverFetch } from './api-failover';
import { config } from './config';
import { supabase } from './supabase';

/**
 * Single shared ApiClient instance. The `getJwt` resolver reads the current
 * Supabase session on every request, so token refreshes are picked up
 * automatically and sign-out immediately invalidates subsequent calls.
 */
export const api = createApiClient({
  baseUrl: config.apiUrl,
  // Falls back to config.apiBackupUrl when the primary host can't be reached at
  // all (a router refusing the name). A no-op when no backup is configured.
  fetch: createFailoverFetch({ primary: config.apiUrl, backup: config.apiBackupUrl }),
  // Lets the server refuse a subscription checkout from a store build, where
  // Apple and Google forbid selling. See lib/platform-capabilities.
  platform: Platform.OS,
  getJwt: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },
});

export { ApiError } from '@seamflow/api-client';
