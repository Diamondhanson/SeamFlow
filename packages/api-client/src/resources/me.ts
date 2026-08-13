import type { HttpClient } from '../http';
import type { DeletionState, Tailor, User, UserRole } from '@seamflow/schemas';

export interface MeResponse {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  profile: User | null;
  tailor: Tailor | null;
  /**
   * Rides along on the call every screen already makes, so a pending deletion
   * surfaces the moment they sign in — which is the only reliable way someone
   * who changed their mind ever finds the cancel button.
   */
  deletion?: DeletionState;
}

export function makeMeResource(http: HttpClient) {
  return {
    /** GET /me — current user's profile + tailor (if any). */
    get(): Promise<MeResponse> {
      return http.get<MeResponse>('/me');
    },
  };
}

export type MeResource = ReturnType<typeof makeMeResource>;
