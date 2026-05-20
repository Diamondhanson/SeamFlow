// ============================================================================
// Mutation defaults — the offline-mutation replay backbone.
//
// Problem: when the app goes offline, TanStack Query pauses any pending
// mutation in its MutationCache. If the user only loses signal briefly, the
// mutation resumes when the network returns and everything's fine. But if
// the user *kills* the app while still offline (force-quit on iOS, kill
// from recent-apps on Android), the in-memory MutationCache disappears and
// the queued mutations vanish with it — even though our optimistic update
// already made the UI show the change as committed.
//
// Solution: persist paused mutations to AsyncStorage (handled by the
// `react-query-persist-client` integration with `shouldDehydrateMutation`).
// But when those mutations come back on app start, their `mutationFn` is
// `undefined` — closures don't survive JSON serialization. So we have to
// register the canonical mutationFn for each mutation key here, and the
// hooks that USE them have to declare the matching `mutationKey`. TanStack
// then wires up the persisted mutation to the registered default.
//
// Scope: only the 4 order mutations get this treatment. The wedding-venue
// scenario (offline, take order, kill app, come back online tomorrow) is
// the killer use case and lives entirely on order writes. Other mutations
// still pause+resume in-memory (`networkMode: 'offlineFirst'`) but don't
// survive app kill — acceptable for things like editing the tailor profile
// or registering a push token.
// ============================================================================

import type { QueryClient } from '@tanstack/react-query';
import type {
  Order,
  OrderCreateInput,
  OrderTransitionInput,
  OrderUpdateInput,
} from '@seamflow/schemas';
import { api } from './api';
import { qk } from './query-keys';

// Stable, serialization-safe mutation keys. Per-id mutations use a prefix
// + the id in variables (NOT in the key) so the registered defaults match
// every instance, regardless of which order id is being touched.
export const mk = {
  createOrder: ['createOrder'] as const,
  updateOrder: ['updateOrder'] as const,
  transitionOrder: ['transitionOrder'] as const,
  deleteOrder: ['deleteOrder'] as const,
} as const;

export interface UpdateOrderVars {
  id: string;
  input: OrderUpdateInput;
}
export interface TransitionOrderVars {
  id: string;
  input: OrderTransitionInput;
}
export interface DeleteOrderVars {
  id: string;
}

export function registerMutationDefaults(qc: QueryClient): void {
  // -----------------
  // createOrder
  // -----------------
  qc.setMutationDefaults(mk.createOrder, {
    mutationFn: (input: OrderCreateInput) => api.orders.create(input),
    onSuccess: (created: Order) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: qk.client(created.clientId) });
    },
  });

  // -----------------
  // updateOrder
  // -----------------
  qc.setMutationDefaults(mk.updateOrder, {
    mutationFn: ({ id, input }: UpdateOrderVars) => api.orders.update(id, input),
    onSuccess: (_data, vars: UpdateOrderVars) => {
      qc.invalidateQueries({ queryKey: qk.order(vars.id) });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // -----------------
  // transitionOrder
  // -----------------
  qc.setMutationDefaults(mk.transitionOrder, {
    mutationFn: ({ id, input }: TransitionOrderVars) => api.orders.transition(id, input),
    // Optimistic update so the status pill flips instantly even before the
    // server has acknowledged. If the mutation later fails we roll back
    // via the snapshot returned from `onMutate`.
    onMutate: async (vars: TransitionOrderVars) => {
      await qc.cancelQueries({ queryKey: qk.order(vars.id) });
      const previous = qc.getQueryData<{ status: string } | undefined>(qk.order(vars.id));
      if (previous) {
        qc.setQueryData(qk.order(vars.id), { ...previous, status: vars.input.to });
      }
      return { previous };
    },
    onError: (_err, vars: TransitionOrderVars, ctx) => {
      const snapshot = (ctx as { previous?: unknown } | undefined)?.previous;
      if (snapshot) {
        qc.setQueryData(qk.order(vars.id), snapshot);
      }
    },
    onSettled: (_data, _err, vars: TransitionOrderVars) => {
      qc.invalidateQueries({ queryKey: qk.order(vars.id) });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // -----------------
  // deleteOrder
  // -----------------
  qc.setMutationDefaults(mk.deleteOrder, {
    mutationFn: ({ id }: DeleteOrderVars) => api.orders.delete(id),
    onSuccess: (_data, vars: DeleteOrderVars) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.removeQueries({ queryKey: qk.order(vars.id) });
    },
  });
}
