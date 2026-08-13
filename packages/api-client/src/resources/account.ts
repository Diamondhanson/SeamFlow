import type { HttpClient } from '../http';
import type { AccountExport, DeletionState } from '@seamflow/schemas';

/**
 * Account lifecycle.
 *
 * `requestDeletion` will be refused unless the caller signed in within the
 * last few minutes — the app is expected to make the user re-enter their
 * password first and send the token that produces. See the API's
 * AccountService.assertFreshAuth for why a confirmation dialog is not enough.
 */
export function makeAccountResource(http: HttpClient) {
  return {
    /** GET /account/deletion — null fields mean the account is live. */
    deletionState(): Promise<DeletionState> {
      return http.get<DeletionState>('/account/deletion');
    },

    /** POST /account/deletion — starts the 30-day grace period. */
    requestDeletion(reason?: string): Promise<DeletionState> {
      return http.post<DeletionState>('/account/deletion', reason ? { reason } : {});
    },

    /** DELETE /account/deletion — change of mind, no re-auth required. */
    cancelDeletion(): Promise<DeletionState> {
      return http.delete<DeletionState>('/account/deletion');
    },

    /** GET /account/export — everything we hold, as one document. */
    export(): Promise<AccountExport> {
      return http.get<AccountExport>('/account/export');
    },
  };
}

export type AccountResource = ReturnType<typeof makeAccountResource>;
