import type { HttpClient } from '../http';
import type { Tailor, User, UserRole } from '@seamflow/schemas';

export interface MeResponse {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  profile: User | null;
  tailor: Tailor | null;
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
