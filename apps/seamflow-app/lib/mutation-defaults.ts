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
// Scope: the core tailor CRUD gets this treatment — orders, clients, fabrics,
// and invoices (create / update / delete). The wedding-venue scenario (offline,
// take an order + edit a client/fabric, kill the app, come back online
// tomorrow) survives across all of them. Remaining mutations (group members,
// tailor profile, notification prefs, push tokens) still pause+resume in-memory
// (mutations default to `networkMode: 'online'`, so they wait for a connection
// rather than failing) but are not yet persisted across an app kill.
// ============================================================================

import type { QueryClient } from '@tanstack/react-query';
import type {
  Client,
  ClientCreateInput,
  ClientUpdateInput,
  FabricResponse,
  FabricCreateInput,
  FabricUpdateInput,
  InvoiceWithContext,
  InvoiceUpdateInput,
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
  createClient: ['createClient'] as const,
  updateClient: ['updateClient'] as const,
  deleteClient: ['deleteClient'] as const,
  createFabric: ['createFabric'] as const,
  updateFabric: ['updateFabric'] as const,
  deleteFabric: ['deleteFabric'] as const,
  createInvoiceForOrder: ['createInvoiceForOrder'] as const,
  updateInvoice: ['updateInvoice'] as const,
  deleteInvoice: ['deleteInvoice'] as const,
} as const;

/** Variables for per-id delete mutations — the id travels in the vars (not the
 *  key) so the persisted, replayed form carries everything it needs. */
export interface ByIdVars {
  id: string;
}
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
export interface UpdateClientVars {
  id: string;
  input: ClientUpdateInput;
}
export interface UpdateFabricVars {
  id: string;
  input: FabricUpdateInput;
}
export interface UpdateInvoiceVars {
  id: string;
  input: InvoiceUpdateInput;
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

  // -----------------
  // Clients
  // -----------------
  qc.setMutationDefaults(mk.createClient, {
    mutationFn: (input: ClientCreateInput) => api.clients.create(input),
    onSuccess: (created: Client) => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.setQueryData(qk.client(created.id), created);
    },
  });
  qc.setMutationDefaults(mk.updateClient, {
    mutationFn: ({ id, input }: UpdateClientVars) => api.clients.update(id, input),
    onSuccess: (updated: Client, vars: UpdateClientVars) => {
      qc.setQueryData(qk.client(vars.id), updated);
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
  qc.setMutationDefaults(mk.deleteClient, {
    mutationFn: ({ id }: ByIdVars) => api.clients.delete(id),
    onSuccess: (_data, vars: ByIdVars) => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.removeQueries({ queryKey: qk.client(vars.id) });
    },
  });

  // -----------------
  // Fabrics
  // -----------------
  qc.setMutationDefaults(mk.createFabric, {
    mutationFn: (input: FabricCreateInput) => api.fabrics.create(input),
    onSuccess: (created: FabricResponse) => {
      qc.invalidateQueries({ queryKey: qk.fabrics() });
      qc.setQueryData(qk.fabric(created.id), created);
    },
  });
  qc.setMutationDefaults(mk.updateFabric, {
    mutationFn: ({ id, input }: UpdateFabricVars) => api.fabrics.update(id, input),
    onSuccess: (updated: FabricResponse, vars: UpdateFabricVars) => {
      qc.setQueryData(qk.fabric(vars.id), updated);
      qc.invalidateQueries({ queryKey: qk.fabrics() });
    },
  });
  qc.setMutationDefaults(mk.deleteFabric, {
    mutationFn: ({ id }: ByIdVars) => api.fabrics.delete(id),
    onSuccess: (_data, vars: ByIdVars) => {
      qc.invalidateQueries({ queryKey: qk.fabrics() });
      qc.removeQueries({ queryKey: qk.fabric(vars.id) });
    },
  });

  // -----------------
  // Invoices
  // -----------------
  qc.setMutationDefaults(mk.createInvoiceForOrder, {
    mutationFn: (orderId: string) => api.invoices.createForOrder(orderId),
    onSuccess: (created: InvoiceWithContext) => {
      qc.invalidateQueries({ queryKey: qk.invoices() });
      qc.setQueryData(qk.invoice(created.id), created);
    },
  });
  qc.setMutationDefaults(mk.updateInvoice, {
    mutationFn: ({ id, input }: UpdateInvoiceVars) => api.invoices.update(id, input),
    onSuccess: (updated: InvoiceWithContext, vars: UpdateInvoiceVars) => {
      qc.setQueryData(qk.invoice(vars.id), updated);
      qc.invalidateQueries({ queryKey: qk.invoices() });
    },
  });
  qc.setMutationDefaults(mk.deleteInvoice, {
    mutationFn: ({ id }: ByIdVars) => api.invoices.delete(id),
    onSuccess: (_data, vars: ByIdVars) => {
      qc.invalidateQueries({ queryKey: qk.invoices() });
      qc.removeQueries({ queryKey: qk.invoice(vars.id) });
    },
  });
}
