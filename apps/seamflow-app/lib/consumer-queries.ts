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
import type {
  ConversationCreateInput,
  ConsumerMeasurementCreateInput,
  ConsumerMeasurementUpdateInput,
  FeedQuery,
  RequestCreateInput,
  RequestUpdateInput,
} from '@seamflow/schemas';
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

// ── Consumer inbox: orders claimed by share-link, and the measurement locker ──

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

/** The user's measurement locker: their own sets + tailor-saved ones. */
export const useConsumerMeasurements = () =>
  useQuery({
    queryKey: qk.consumerMeasurements(),
    queryFn: () => api.consumer.listMeasurements(),
  });

/** Create a customer-owned measurement set. */
export function useCreateConsumerMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ConsumerMeasurementCreateInput) => api.consumer.createMeasurement(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.consumerMeasurements() }),
  });
}

/** Update a customer-owned measurement set. */
export function useUpdateConsumerMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ConsumerMeasurementUpdateInput }) =>
      api.consumer.updateMeasurement(id, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.consumerMeasurements() }),
  });
}

/** Delete a customer-owned measurement set. */
export function useDeleteConsumerMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.consumer.deleteMeasurement(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.consumerMeasurements() }),
  });
}

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
  return trimmed.replace(/^.*\//, '');
}

// ── "Can you make this?" — the client request board + offers ─────────────────

export const useMyRequests = () =>
  useQuery({ queryKey: qk.myRequests(), queryFn: () => api.requests.listMine() });

export const useMyRequest = (id: string) =>
  useQuery({ queryKey: qk.myRequest(id), queryFn: () => api.requests.get(id), enabled: !!id });

export const useRequestOffers = (id: string) =>
  useQuery({ queryKey: qk.requestOffers(id), queryFn: () => api.requests.offers(id), enabled: !!id });

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
      void qc.invalidateQueries({ queryKey: qk.myRequests() });
      void qc.invalidateQueries({ queryKey: qk.myRequest(id) });
    },
  });
}

export function useCloseRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.requests.close(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.myRequests() });
      void qc.invalidateQueries({ queryKey: qk.myRequest(id) });
    },
  });
}

/** Accept a tailor's offer — also refreshes conversations (it opens the thread). */
export function useAcceptOffer(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (offerId: string) => api.requests.acceptOffer(offerId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.myRequest(requestId) });
      void qc.invalidateQueries({ queryKey: qk.requestOffers(requestId) });
      void qc.invalidateQueries({ queryKey: qk.conversations() });
    },
  });
}
