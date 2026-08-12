// ============================================================================
// Consumer data hooks — TanStack Query over the /consumer/* API.
// ============================================================================

import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import type {
  ConversationCreateInput,
  FeedQuery,
  RequestCreateInput,
  RequestUpdateInput,
} from '@seamflow/schemas';
import { api } from './api';
import { qk } from './query-keys';

/** The user's unified orders inbox, across every tailor. */
export const useConsumerOrders = () =>
  useQuery({ queryKey: qk.consumerOrders(), queryFn: () => api.consumer.listOrders() });

/** Full detail for one claimed order. */
export const useConsumerOrder = (id: string) =>
  useQuery({
    queryKey: qk.consumerOrder(id),
    queryFn: () => api.consumer.getOrder(id),
    enabled: !!id,
  });

/** The user's measurement locker. */
export const useConsumerMeasurements = () =>
  useQuery({
    queryKey: qk.consumerMeasurements(),
    queryFn: () => api.consumer.listMeasurements(),
  });

/** Claim an order from its share-link token (or full share URL). */
export function useClaimOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => api.consumer.claim({ token }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.consumerOrders() });
      void qc.invalidateQueries({ queryKey: qk.consumerMeasurements() });
    },
  });
}

/** Pull the share code out of a pasted link (…/o/<code>) or return the raw input. */
export function extractShareCode(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/o\/([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  // Otherwise assume they pasted just the code.
  return trimmed.replace(/^.*\//, '');
}

// ============================================================================
// Discovery — the public feed, one design, and a tailor's storefront.
//
// These reads work signed-out (decision D-4: browse without an account, sign in
// only to inquire or save), so none of them is gated on a session.
// ============================================================================

export const useFeed = (filter: Partial<FeedQuery> = {}) =>
  useInfiniteQuery({
    queryKey: qk.feed(filter as Record<string, string | undefined>),
    queryFn: ({ pageParam }) =>
      api.feed.list({ ...filter, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

export const useFeedPost = (id: string) =>
  useQuery({ queryKey: qk.feedPost(id), queryFn: () => api.feed.get(id), enabled: !!id });

export const useStorefront = (tailorId: string) =>
  useQuery({
    queryKey: qk.storefront(tailorId),
    queryFn: () => api.feed.storefront(tailorId),
    enabled: !!tailorId,
  });

// ============================================================================
// Chat — the client half. Same endpoints as the tailor app; the API resolves
// which side you are from the token, so nothing here is role-specific.
// ============================================================================

export const useConversations = () =>
  useInfiniteQuery({
    queryKey: qk.conversations(),
    queryFn: ({ pageParam }) =>
      api.conversations.list({ cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 15_000,
  });

export const useConversation = (id: string) =>
  useQuery({
    queryKey: qk.conversation(id),
    queryFn: () => api.conversations.get(id),
    enabled: !!id,
  });

export const useMessages = (conversationId: string) =>
  useInfiniteQuery({
    queryKey: qk.conversationMessages(conversationId),
    queryFn: ({ pageParam }) =>
      api.conversations.messages(conversationId, {
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!conversationId,
  });

/** The Inquire action: creates or reuses the thread for this design. */
export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ConversationCreateInput) => api.conversations.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.conversations() }),
  });
}

export function useMarkConversationRead(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.conversations.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.conversations() });
      qc.invalidateQueries({ queryKey: qk.conversation(id) });
    },
  });
}

// ============================================================================
// Notification inbox
//
// One query key for the whole list. Marking read invalidates it rather than
// patching the cache: the server returns the authoritative unreadCount with
// every page, and hand-decrementing a badge is how badges end up lying.
// ============================================================================

export const useNotifications = () =>
  useInfiniteQuery({
    queryKey: qk.notifications(),
    queryFn: ({ pageParam }) =>
      api.notifications.list({ cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 15_000,
  });

/** Unread badge. Cheap enough to poll on focus; no realtime dependency. */
export const useUnreadNotificationCount = () =>
  useQuery({
    queryKey: [...qk.notifications(), 'unread'],
    queryFn: () => api.notifications.unreadCount(),
    staleTime: 30_000,
  });

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications() }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications() }),
  });
}

// ============================================================================
// Requests — "Can you make this?" (ROADMAP appendix H)
//
// The client's side: post a brief, watch the offers come in, pick one. The
// mirror of browsing the feed — and the direction that works even when no
// tailor has published anything yet.
// ============================================================================

export const useMyRequests = () =>
  useQuery({ queryKey: qk.myRequests(), queryFn: () => api.requests.listMine() });

export const useMyRequest = (id: string) =>
  useQuery({
    queryKey: qk.myRequest(id),
    queryFn: () => api.requests.get(id),
    enabled: !!id,
  });

export const useRequestOffers = (id: string) =>
  useQuery({
    queryKey: qk.requestOffers(id),
    queryFn: () => api.requests.offers(id),
    enabled: !!id,
  });

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RequestCreateInput) => api.requests.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.myRequests() }),
  });
}

export function useUpdateRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RequestUpdateInput) => api.requests.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.myRequests() });
      qc.invalidateQueries({ queryKey: qk.myRequest(id) });
    },
  });
}

export function useCloseRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.requests.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.myRequests() });
      qc.invalidateQueries({ queryKey: qk.myRequest(id) });
    },
  });
}

/**
 * Pick a tailor.
 *
 * Invalidates conversations too: accepting opens (or revives) the thread the
 * two of them continue in, and the inbox has to know about it immediately —
 * that thread is where the client is sent next.
 */
export function useAcceptOffer(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (offerId: string) => api.requests.acceptOffer(offerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.myRequest(requestId) });
      qc.invalidateQueries({ queryKey: qk.requestOffers(requestId) });
      qc.invalidateQueries({ queryKey: qk.conversations() });
    },
  });
}
