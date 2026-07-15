import { createApiClient } from '@seamflow/api-client';
import { config } from './config';
import { supabase } from './supabase';

/**
 * Single shared ApiClient instance. The `getJwt` resolver reads the current
 * Supabase session on every request, so token refreshes are picked up
 * automatically and sign-out immediately invalidates subsequent calls.
 */
export const api = createApiClient({
  baseUrl: config.apiUrl,
  getJwt: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },
});

export { ApiError } from '@seamflow/api-client';
