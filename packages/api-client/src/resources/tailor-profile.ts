import type { HttpClient } from '../http';
import type { Tailor, TailorProfileUpdateInput } from '@seamflow/schemas';

/**
 * The owning tailor's storefront fields (ROADMAP D.2.2).
 *
 * Separate from `me.upsertTailor` on purpose: that one owns the operational
 * identity (business name, country, currency) and is required during
 * onboarding. This one owns the public-facing shop window and is entirely
 * optional. `isVerified` and `responseTimeHours` are absent by design — a
 * trust signal you can set about yourself isn't worth showing.
 */
export function makeTailorProfileResource(http: HttpClient) {
  return {
    update(input: TailorProfileUpdateInput): Promise<Tailor> {
      return http.patch<Tailor>('/me/tailor-profile', input);
    },
  };
}

export type TailorProfileResource = ReturnType<typeof makeTailorProfileResource>;
