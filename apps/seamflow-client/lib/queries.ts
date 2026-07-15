// ============================================================================
// Consumer data hooks — TanStack Query over the /consumer/* API.
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
