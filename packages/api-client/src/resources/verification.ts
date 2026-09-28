import type { HttpClient } from '../http';
import type {
  VerificationBadge,
  VerificationEvidence,
  VerificationRequest,
  VerificationState,
} from '@seamflow/schemas';

/**
 * Verification (appendix J).
 *
 * Nothing here is required to use SeamFlow. A tailor who never calls any of it
 * keeps every feature they have, Discover included — so treat a failure on any
 * of these as "the prompt does not appear", never as "the screen is broken".
 */
export function makeVerificationResource(http: HttpClient) {
  return {
    /**
     * GET /me/verification — where they stand, plus the preconditions.
     *
     * `available: false` means the server cannot run this at all (no OTP
     * provider, so a confirmed phone is impossible). Read it before showing any
     * prompt.
     */
    state(): Promise<VerificationState> {
      return http.get<VerificationState>('/me/verification');
    },

    /**
     * POST /me/verification — ask to be verified.
     *
     * Refused with 400 when the shop profile or the confirmed phone is missing,
     * and 409 when a request is already pending. All three are things the
     * tailor can see and fix, which is why `state()` reports them up front.
     */
    submit(evidence: VerificationEvidence[]): Promise<VerificationRequest> {
      return http.post<VerificationRequest>('/me/verification', { evidence });
    },

    /** DELETE /me/verification — take it back before anyone has looked. */
    withdraw(): Promise<VerificationRequest> {
      return http.delete<VerificationRequest>('/me/verification');
    },

    /**
     * GET /tailors/:id/badge — what a client sees when they tap the tick.
     *
     * Contains nothing private: whether someone is reachable, never the number.
     */
    badge(tailorId: string): Promise<VerificationBadge> {
      return http.get<VerificationBadge>(`/tailors/${tailorId}/badge`);
    },
  };
}

export type VerificationResource = ReturnType<typeof makeVerificationResource>;
