import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Client,
  ClientCreateInput,
  ClientUpdateInput,
  DesignUpdateInput,
  FabricCreateInput,
  FabricResponse,
  FabricUpdateInput,
  InvoiceWithContext,
  NotificationPreferences,
  NotificationPreferencesUpdateInput,
  GroupOrder,
  GroupOrderCreateInput,
  GroupOrderMemberCreateInput,
  GroupOrderMemberUpdateInput,
  GroupOrderUpdateInput,
  GroupOrderWithMembers,
  GroupOrderWithMembersCreateInput,
  InvoiceUpdateInput,
  MeasurementSetCreateInput,
  MeasurementSetUpdateInput,
  MeasurementTemplateCreateInput,
  MeasurementTemplateUpdateInput,
  Order,
  OrderCreateInput,
  OrderStatus,
  OrderTransitionInput,
  OrderUpdateInput,
  PromoteMemberToClientInput,
  TailorUpsertInput,
} from '@seamflow/schemas';
import { api } from './api';
import { qk } from './query-keys';
import { defaultNotificationPreferences } from './notification-defaults';
import {
  mk,
  type ByIdVars,
  type DeleteOrderVars,
  type TransitionOrderVars,
  type UpdateClientVars,
  type UpdateFabricVars,
  type UpdateInvoiceVars,
  type UpdateOrderVars,
} from './mutation-defaults';

// Re-export qk so existing imports of `qk` from './queries' continue to work
// without churning every screen.
export { qk } from './query-keys';

// ============================================================================
// /me + tailor
// ============================================================================

export const useMe = () => useQuery({ queryKey: qk.me(), queryFn: () => api.me.get() });

export function useUpsertMyTailor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TailorUpsertInput) => api.tailors.upsertMine(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me() }),
  });
}

// ============================================================================
// Clients
// ============================================================================

export const useClients = (q?: string) =>
  useQuery({
    queryKey: qk.clients(q),
    queryFn: () => api.clients.list({ limit: 100, q: q || undefined }),
  });

export const useClient = (id: string) =>
  useQuery({ queryKey: qk.client(id), queryFn: () => api.clients.get(id), enabled: !!id });

// Client / fabric / invoice create-update-delete use `mutationKey` (defaults
// registered in mutation-defaults.ts) so offline edits survive an app kill,
// exactly like the order mutations. Cache invalidation lives in the defaults;
// component-level onSuccess/onError still fire on top.
export function useCreateClient() {
  return useMutation<Client, Error, ClientCreateInput>({ mutationKey: mk.createClient });
}

export function useUpdateClient(id: string) {
  const m = useMutation<Client, Error, UpdateClientVars>({ mutationKey: mk.updateClient });
  return wrapWithId<Client, ClientUpdateInput, UpdateClientVars>(m, (input) => ({ id, input }));
}

export function useDeleteClient(id: string) {
  const m = useMutation<void, Error, ByIdVars>({ mutationKey: mk.deleteClient });
  return wrapWithId<void, void, ByIdVars>(m, () => ({ id }));
}

// ============================================================================
// Measurement sets
// ============================================================================

export const useMeasurementSets = (clientId: string) =>
  useQuery({
    queryKey: qk.measurementSets(clientId),
    queryFn: () => api.measurementSets.listForClient(clientId),
    enabled: !!clientId,
  });

export function useCreateMeasurementSet(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MeasurementSetCreateInput) =>
      api.measurementSets.createForClient(clientId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.measurementSets(clientId) }),
  });
}

export function useUpdateMeasurementSet(setId: string, clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MeasurementSetUpdateInput) =>
      api.measurementSets.update(setId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.measurementSets(clientId) }),
  });
}

export function useDeleteMeasurementSet(setId: string, clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.measurementSets.delete(setId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.measurementSets(clientId) }),
  });
}

// ============================================================================
// Templates
// ============================================================================

export const useTemplates = () =>
  useQuery({ queryKey: qk.templates(), queryFn: () => api.measurementTemplates.list() });

export const useTemplate = (id: string) =>
  useQuery({
    queryKey: qk.template(id),
    queryFn: () => api.measurementTemplates.get(id),
    enabled: !!id,
  });

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MeasurementTemplateCreateInput) =>
      api.measurementTemplates.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.templates() }),
  });
}

export function useUpdateTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MeasurementTemplateUpdateInput) =>
      api.measurementTemplates.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.templates() });
      qc.invalidateQueries({ queryKey: qk.template(id) });
    },
  });
}

export function useDeleteTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.measurementTemplates.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.templates() });
      qc.removeQueries({ queryKey: qk.template(id) });
    },
  });
}

// ============================================================================
// Fabric library
// ============================================================================

export const useFabrics = () =>
  useQuery({ queryKey: qk.fabrics(), queryFn: () => api.fabrics.list() });

export const useFabric = (id: string) =>
  useQuery({
    queryKey: qk.fabric(id),
    queryFn: () => api.fabrics.get(id),
    enabled: !!id,
  });

export function useCreateFabric() {
  return useMutation<FabricResponse, Error, FabricCreateInput>({
    mutationKey: mk.createFabric,
  });
}

export function useUpdateFabric(id: string) {
  const m = useMutation<FabricResponse, Error, UpdateFabricVars>({
    mutationKey: mk.updateFabric,
  });
  return wrapWithId<FabricResponse, FabricUpdateInput, UpdateFabricVars>(m, (input) => ({
    id,
    input,
  }));
}

export function useDeleteFabric(id: string) {
  const m = useMutation<void, Error, ByIdVars>({ mutationKey: mk.deleteFabric });
  return wrapWithId<void, void, ByIdVars>(m, () => ({ id }));
}

// ============================================================================
// Group orders + members
// ============================================================================

export const useGroupOrders = () =>
  useQuery({
    queryKey: qk.groups(),
    queryFn: () => api.groupOrders.list({ limit: 100 }),
  });

export const useGroupOrder = (id: string) =>
  useQuery({
    queryKey: qk.group(id),
    queryFn: () => api.groupOrders.get(id),
    enabled: !!id,
  });

export function useCreateGroupOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GroupOrderCreateInput) => api.groupOrders.create(input),
    onSuccess: (created: GroupOrder) => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.setQueryData(qk.group(created.id), { ...created, members: [] });
    },
  });
}

/**
 * Atomic create — pairs with POST /group-orders/with-members. Resolves the
 * owner (existing client or new contact) and inserts inline members in a
 * single server-side transaction. We also invalidate the clients list
 * because a "new contact" owner just minted a new client row.
 */
export function useCreateGroupOrderWithMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GroupOrderWithMembersCreateInput) =>
      api.groupOrders.createWithMembers(input),
    onSuccess: (created: GroupOrderWithMembers) => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.setQueryData(qk.group(created.id), created);
    },
  });
}

export function useUpdateGroupOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GroupOrderUpdateInput) => api.groupOrders.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: qk.group(id) });
    },
  });
}

export function useDeleteGroupOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.groupOrders.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.removeQueries({ queryKey: qk.group(id) });
    },
  });
}

export function useAddGroupMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GroupOrderMemberCreateInput) =>
      api.groupOrderMembers.createForGroup(groupId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.group(groupId) }),
  });
}

export function useUpdateGroupMember(memberId: string, groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GroupOrderMemberUpdateInput) =>
      api.groupOrderMembers.update(memberId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.group(groupId) }),
  });
}

export function useDeleteGroupMember(memberId: string, groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.groupOrderMembers.delete(memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.group(groupId) }),
  });
}

export function usePromoteMember(memberId: string, groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PromoteMemberToClientInput) =>
      api.groupOrderMembers.promoteToClient(memberId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.group(groupId) });
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useCopyMemberMeasurements(memberId: string, groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.groupOrderMembers.copyMeasurementsFromClient(memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.group(groupId) }),
  });
}

// ============================================================================
// Orders
// ============================================================================

interface UseOrdersFilter {
  clientId?: string;
  status?: OrderStatus;
  /** Free-text — matches orderName. */
  q?: string;
  /** ISO timestamp. */
  dueBefore?: string;
  /** ISO timestamp. */
  dueAfter?: string;
}

export const useOrders = (filter?: UseOrdersFilter) =>
  useQuery({
    queryKey: qk.orders(filter),
    queryFn: () => api.orders.list({ limit: 100, ...filter }),
  });

export const useOrder = (id: string) =>
  useQuery({ queryKey: qk.order(id), queryFn: () => api.orders.get(id), enabled: !!id });

// ============================================================================
// Order mutations
//
// These four use `mutationKey` so the persisted MutationCache (see
// `mutation-defaults.ts`) can replay them after the app is killed offline.
// The hook signatures still accept `id` at hook-creation time for caller
// ergonomics — internally we repack `id` into the mutation variables so the
// dehydrated form carries everything needed to re-run.
//
// Component-level `onSuccess` / `onError` passed to `mutate()` still fire
// alongside the registered defaults (TanStack runs both), so screens can
// still show their own toasts/navigation on top of the global cache
// invalidation.
// ============================================================================

export function useCreateOrder() {
  // No id binding — `mutationKey` matches what registerMutationDefaults wired
  // up. Variables are the OrderCreateInput as before.
  return useMutation<Order, Error, OrderCreateInput>({
    mutationKey: mk.createOrder,
  });
}

export function useUpdateOrder(id: string) {
  const m = useMutation<Order, Error, UpdateOrderVars>({
    mutationKey: mk.updateOrder,
  });
  return wrapWithId<Order, OrderUpdateInput, UpdateOrderVars>(m, (input) => ({
    id,
    input,
  }));
}

export function useTransitionOrder(id: string) {
  const m = useMutation<Order, Error, TransitionOrderVars>({
    mutationKey: mk.transitionOrder,
  });
  return wrapWithId<Order, OrderTransitionInput, TransitionOrderVars>(m, (input) => ({
    id,
    input,
  }));
}

export function useDeleteOrder(id: string) {
  const m = useMutation<void, Error, DeleteOrderVars>({
    mutationKey: mk.deleteOrder,
  });
  return wrapWithId<void, void, DeleteOrderVars>(m, () => ({ id }));
}

// ----------------------------------------------------------------------------
// Helper: re-bind a mutation that takes `{ id, input }` so callers can pass
// just `input` and we wrap it back to the registered shape. Keeps the hook
// API identical to the pre-1.4-polish version.
// ----------------------------------------------------------------------------

interface MutationLike<TData, TVars> {
  mutate: (vars: TVars, opts?: MutationCallbackOpts<TData, TVars>) => void;
  mutateAsync: (vars: TVars) => Promise<TData>;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  data: TData | undefined;
  reset: () => void;
}

interface MutationCallbackOpts<TData, TVars> {
  onSuccess?: (data: TData, vars: TVars) => void;
  onError?: (err: Error, vars: TVars) => void;
  onSettled?: (data: TData | undefined, err: Error | null, vars: TVars) => void;
}

function wrapWithId<TData, TPublicInput, TPrivateVars>(
  m: MutationLike<TData, TPrivateVars>,
  pack: (input: TPublicInput) => TPrivateVars,
): MutationLike<TData, TPublicInput> {
  return {
    mutate: (input, opts) => {
      const vars = pack(input);
      // Translate the inner vars back to the public input shape inside
      // user-supplied callbacks so the type contract matches at runtime.
      const innerOpts: MutationCallbackOpts<TData, TPrivateVars> | undefined = opts
        ? {
            onSuccess: opts.onSuccess
              ? (data) => opts.onSuccess?.(data, input)
              : undefined,
            onError: opts.onError
              ? (err) => opts.onError?.(err, input)
              : undefined,
            onSettled: opts.onSettled
              ? (data, err) => opts.onSettled?.(data, err, input)
              : undefined,
          }
        : undefined;
      m.mutate(vars, innerOpts);
    },
    mutateAsync: (input) => m.mutateAsync(pack(input)),
    isPending: m.isPending,
    isError: m.isError,
    isSuccess: m.isSuccess,
    error: m.error,
    data: m.data,
    reset: m.reset,
  };
}

// ============================================================================
// Order photos
// ============================================================================

export const useOrderPhotos = (orderId: string) =>
  useQuery({
    queryKey: qk.orderPhotos(orderId),
    queryFn: () => api.orderPhotos.listForOrder(orderId),
    enabled: !!orderId,
  });

export function useDeleteOrderPhoto(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => api.orderPhotos.delete(photoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orderPhotos(orderId) }),
  });
}

// ============================================================================
// Designs (inspiration library / moodboard)
// ============================================================================

export const useDesigns = () =>
  useQuery({ queryKey: qk.designs(), queryFn: () => api.designs.list() });

export const useDesign = (id: string) =>
  useQuery({
    queryKey: qk.design(id),
    queryFn: () => api.designs.get(id),
    enabled: !!id,
  });

export function useUpdateDesign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DesignUpdateInput) => api.designs.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.designs() });
      qc.invalidateQueries({ queryKey: qk.design(id) });
    },
  });
}

export function useDeleteDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (designId: string) => api.designs.delete(designId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.designs() }),
  });
}

export function useAttachDesignToOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { designId: string; orderId: string }) =>
      api.designs.attachToOrder(vars.designId, vars.orderId),
    onSuccess: (_res, vars) =>
      qc.invalidateQueries({ queryKey: qk.orderPhotos(vars.orderId) }),
  });
}

// ============================================================================
// Notification preferences
// ============================================================================

export const useNotificationPreferences = () =>
  useQuery({
    queryKey: qk.notificationPreferences(),
    queryFn: () => api.notificationPreferences.get(),
  });

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationPreferencesUpdateInput) =>
      api.notificationPreferences.update(input),
    // Optimistic: apply the change to the cache immediately so toggles feel
    // instant and remain usable offline. If the request genuinely errors we roll
    // back; if it's merely offline the mutation is paused + replayed by the
    // global paused-mutation queue when connectivity returns.
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: qk.notificationPreferences() });
      const prev = qc.getQueryData<NotificationPreferences>(
        qk.notificationPreferences(),
      );
      const base = prev ?? defaultNotificationPreferences();
      qc.setQueryData(qk.notificationPreferences(), { ...base, ...patch });
      return { prev };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx) qc.setQueryData(qk.notificationPreferences(), ctx.prev);
    },
    onSuccess: (updated) =>
      qc.setQueryData(qk.notificationPreferences(), updated),
  });
}

// ============================================================================
// Share links (Phase 1.5 magic-link order view)
// Regenerate on every share — we don't cache or stash the token client-side.
// ============================================================================

export function useIssueShareLink(orderId: string) {
  return useMutation({
    mutationFn: () => api.shareLinks.issueForOrder(orderId),
  });
}

// ============================================================================
// Invoices
// ============================================================================

export const useInvoices = () =>
  useQuery({ queryKey: qk.invoices(), queryFn: () => api.invoices.list() });

export const useInvoice = (id: string) =>
  useQuery({
    queryKey: qk.invoice(id),
    queryFn: () => api.invoices.get(id),
    enabled: !!id,
  });

/** Create (or open the existing) invoice for an order. */
export function useCreateInvoiceForOrder() {
  return useMutation<InvoiceWithContext, Error, string>({
    mutationKey: mk.createInvoiceForOrder,
  });
}

export function useUpdateInvoice(id: string) {
  const m = useMutation<InvoiceWithContext, Error, UpdateInvoiceVars>({
    mutationKey: mk.updateInvoice,
  });
  return wrapWithId<InvoiceWithContext, InvoiceUpdateInput, UpdateInvoiceVars>(m, (input) => ({
    id,
    input,
  }));
}

export function useDeleteInvoice(id: string) {
  const m = useMutation<void, Error, ByIdVars>({ mutationKey: mk.deleteInvoice });
  return wrapWithId<void, void, ByIdVars>(m, () => ({ id }));
}

export function useIssueInvoiceLink(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.invoices.issueLink(id),
    // Issuing flips the invoice to "sent" server-side — refresh so the UI reflects it.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.invoice(id) });
      qc.invalidateQueries({ queryKey: qk.invoices() });
    },
  });
}
