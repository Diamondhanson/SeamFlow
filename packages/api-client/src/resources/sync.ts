import type { HttpClient } from '../http';
import type { SyncPullRequest, SyncPullResponse } from '@seamflow/schemas';

export function makeSyncResource(http: HttpClient) {
  return {
    /**
     * Pull all changes visible to the authed tailor since `lastPulledAt`.
     * Omit `lastPulledAt` for a first-time full pull.
     *
     * Pattern:
     *   const { timestamp, changes } = await api.sync.pull({ lastPulledAt: stored });
     *   // apply changes to local DB
     *   stored = timestamp; // for the next pull
     */
    pull(input: SyncPullRequest = {}): Promise<SyncPullResponse> {
      return http.post<SyncPullResponse>('/sync/pull', input);
    },
  };
}

export type SyncResource = ReturnType<typeof makeSyncResource>;
