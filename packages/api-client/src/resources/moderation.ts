import type { HttpClient } from '../http';
import type { BlockedUser, CreateReportInput } from '@seamflow/schemas';

/**
 * Moderation — reporting content, and blocking a person.
 *
 * Both are available to everyone, customer and tailor alike, because both see
 * the same user-generated content: a public feed of photographs and a thread
 * with a stranger in it.
 */
export function makeModerationResource(http: HttpClient) {
  return {
    /**
     * POST /reports — tell us something is wrong.
     *
     * Idempotent in practice: reporting the same thing twice while the first
     * report is still open returns that report rather than filing another, so
     * a double tap costs a reviewer nothing.
     *
     * 404 means the content has already gone, which is worth saying plainly
     * rather than treating as a failure.
     */
    report(input: CreateReportInput): Promise<{ id: string }> {
      return http.post<{ id: string }>('/reports', input);
    },

    /** GET /me/blocks — who this person has blocked. */
    blocks(): Promise<BlockedUser[]> {
      return http.get<BlockedUser[]>('/me/blocks');
    },

    /**
     * POST /me/blocks/:userId — stop contact, both ways, immediately.
     *
     * No review and no notification: the other side is never told. Blocking
     * someone already blocked is a no-op rather than an error, because the
     * button may well be tapped from a stale screen.
     */
    block(userId: string): Promise<{ blocked: boolean }> {
      return http.post<{ blocked: boolean }>(`/me/blocks/${userId}`, {});
    },

    /** DELETE /me/blocks/:userId — let them back in. */
    unblock(userId: string): Promise<{ blocked: boolean }> {
      return http.delete<{ blocked: boolean }>(`/me/blocks/${userId}`);
    },
  };
}

export type ModerationResource = ReturnType<typeof makeModerationResource>;
