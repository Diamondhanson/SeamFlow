import type { HttpClient } from '../http';

export interface HealthResponse {
  ok: true;
  version: string;
  uptime_s: number;
  db: 'up' | 'down' | 'not_configured' | 'disabled';
  redis: 'up' | 'down' | 'not_configured' | 'disabled';
  sentry: 'enabled' | 'disabled';
}

export function makeHealthResource(http: HttpClient) {
  return {
    /** GET /health — public, no auth required. */
    check(): Promise<HealthResponse> {
      return http.get<HealthResponse>('/health');
    },
  };
}

export type HealthResource = ReturnType<typeof makeHealthResource>;
