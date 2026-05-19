import type { HttpClient } from '../http';
import type { Tailor, TailorUpsertInput } from '@seamflow/schemas';

export function makeTailorsResource(http: HttpClient) {
  return {
    /** GET /me/tailor — 404 if not yet onboarded. */
    getMine(): Promise<Tailor> {
      return http.get<Tailor>('/me/tailor');
    },
    /** POST /me/tailor — create or update the current user's tailor. */
    upsertMine(input: TailorUpsertInput): Promise<Tailor> {
      return http.post<Tailor>('/me/tailor', input);
    },
  };
}

export type TailorsResource = ReturnType<typeof makeTailorsResource>;
