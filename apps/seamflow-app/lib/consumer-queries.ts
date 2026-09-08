// ============================================================================
// Client-experience data hooks — the public discovery feed + storefronts (and,
// in later slices, the consumer order inbox / measurement locker / requests).
//
// These live alongside the tailor's lib/queries.ts (shared name hooks like
// useMe stay in queries.ts) and use the SAME api-client + query cache, so a
// single signed-in account works across both experiences. The discovery reads
// work signed-out (browse without an account; sign in only to inquire).
// Ported from apps/seamflow-client/lib/queries.ts.
// ============================================================================

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ConversationCreateInput, FeedQuery } from '@seamflow/schemas';
import { api } from './api';
import { qk } from './query-keys';

/** The public masonry feed of tailors' finished work (infinite scroll). */
export const useFeed = (filter: Partial<FeedQuery> = {}) =>
  useInfiniteQuery({
    queryKey: qk.feed(filter as Record<string, string | undefined>),
    queryFn: ({ pageParam }) =>
      api.feed.list({ ...filter, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

/** One design, full-screen. */
export const useFeedPost = (id: string) =>
  useQuery({ queryKey: qk.feedPost(id), queryFn: () => api.feed.get(id), enabled: !!id });

/** A tailor's storefront by id. */
export const useStorefront = (tailorId: string) =>
  useQuery({
    queryKey: qk.storefront(tailorId),
    queryFn: () => api.feed.storefront(tailorId),
    enabled: !!tailorId,
  });

/** A tailor's catalogue resolved from a shared /t/<slug> link (public). */
export const useCatalogue = (slug: string) =>
  useQuery({
    queryKey: qk.catalogue(slug),
    queryFn: () => api.feed.storefrontBySlug(slug),
    enabled: !!slug,
  });

/** Start (or reuse) a conversation with a tailor — the "Inquire" action. */
export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ConversationCreateInput) => api.conversations.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.conversations() }),
  });
}
