import { createApiClient } from '@seamflow/api-client';

/**
 * Server-only API client for the public site.
 *
 * The /public/orders/:token route does not require auth, so we pass no JWT.
 * Base URL comes from the env so we can point at the local NestJS server in
 * dev and the deployed API in prod (later, via Vercel env vars).
 */
export function publicApi() {
  const baseUrl = process.env.SEAMFLOW_API_URL ?? 'http://localhost:3001';
  return createApiClient({ baseUrl });
}
