import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import type {
  Client,
  ClientCreateInput,
  ClientUpdateInput,
  ConversationQuoteInput,
  DesignUpdateInput,
  FabricCreateInput,
  FabricResponse,
  FabricUpdateInput,
  FeedPostCreateInput,
  FeedPostUpdateInput,
  GroupOrder,
  GroupOrderCreateInput,
  GroupOrderMemberCreateInput,
  GroupOrderMemberUpdateInput,
  GroupOrderUpdateInput,
  GroupOrderWithMembers,
  GroupOrderWithMembersCreateInput,
  InvoiceUpdateInput,
  InvoiceWithContext,
  MeasurementSetCreateInput,
  MeasurementSetUpdateInput,
  MeasurementTemplateCreateInput,
  MeasurementTemplateUpdateInput,
  NotificationPreferences,
  NotificationPreferencesUpdateInput,
  NotificationType,
  Order,
  OrderCreateInput,
  OrderStatus,
  OrderTransitionInput,
  OrderUpdateInput,
  PromoteMemberToClientInput,
  TailorProfileUpdateInput,
  TailorUpsertInput,
  WorkAdoptInput,
  WorkPublishInput,
  WorkQuery,
  WorkUpdateInput,
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
// Group order photos (shared reference/inspiration for the whole group)
// ============================================================================

export const useGroupPhotos = (groupOrderId: string) =>
  useQuery({
    queryKey: qk.groupPhotos(groupOrderId),
    queryFn: () => api.groupOrderPhotos.listForGroup(groupOrderId),
    enabled: !!groupOrderId,
  });

export function useDeleteGroupPhoto(groupOrderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => api.groupOrderPhotos.delete(photoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.groupPhotos(groupOrderId) }),
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

// ============================================================================
// Discovery feed — the tailor's published work (ROADMAP D.4.1)
// ============================================================================

export const useMyFeedPosts = () =>
  useQuery({
    queryKey: qk.feedPostsMine(),
    queryFn: () => api.feed.mine(),
  });

/** Opt a finished-order photo into the public feed. */
export function usePublishOrderPhoto(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { orderPhotoId: string; input: FeedPostCreateInput }) =>
      api.feed.publishOrderPhoto(vars.orderPhotoId, vars.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.feedPostsMine() });
      // The order's photo list carries the "In feed" badge, so it must refresh.
      qc.invalidateQueries({ queryKey: qk.orderPhotos(orderId) });
    },
  });
}

/** Edit metadata, or unpublish by passing `status: 'hidden'`. */
export function useUpdateFeedPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: FeedPostUpdateInput }) =>
      api.feed.update(vars.id, vars.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.feedPostsMine() });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useDeleteFeedPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.feed.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.feedPostsMine() });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/** Storefront fields: bio, city, specialties, languages, accepts-remote. */
export function useUpdateTailorProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TailorProfileUpdateInput) => api.tailorProfile.update(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me() }),
  });
}

// ============================================================================
// Chat (ROADMAP D.4.3)
//
// The list and the message pages are both infinite queries. Messages come back
// newest-first from the API and are rendered in an inverted list, so "next
// page" means "older" — which is why nothing here reverses the array.
// ============================================================================

export const useConversations = () =>
  useInfiniteQuery({
    queryKey: qk.conversations(),
    queryFn: ({ pageParam }) =>
      api.conversations.list({ cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // A chat list is worthless when stale; refetch on focus like a mail app.
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

export function useCreateQuoteFromConversation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ConversationQuoteInput) => api.conversations.quote(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.conversation(id) });
      qc.invalidateQueries({ queryKey: qk.conversations() });
      // A new order + draft invoice just appeared.
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: qk.invoices() });
    },
  });
}

// ============================================================================
// My Designs — the tailor's own finished work
//
// Distinct from `useDesigns` (Design Studio = inspiration collected elsewhere).
// A work is private until published; publishing copies a derivative into the
// public feed bucket, unpublishing deletes it again.
// ============================================================================

export const useWorks = (filter: Partial<WorkQuery> = {}) =>
  useInfiniteQuery({
    queryKey: qk.works(filter as Record<string, string | undefined>),
    queryFn: ({ pageParam }) =>
      api.works.list({ ...filter, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

/** Attribute values actually present — the filter bar renders from this. */
export const useWorkFacets = () =>
  useQuery({ queryKey: qk.workFacets(), queryFn: () => api.works.facets() });

export const useWork = (id: string) =>
  useQuery({ queryKey: qk.work(id), queryFn: () => api.works.get(id), enabled: !!id });

/** Everything that changes a work invalidates the grid, facets and the feed. */
function useWorkMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['works'] });
      qc.invalidateQueries({ queryKey: qk.feedPostsMine() });
      // The order-photo strip shows an "In feed" badge sourced from works.
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export const useUpdateWork = () =>
  useWorkMutation<{ id: string; input: WorkUpdateInput }>((v) =>
    api.works.update(v.id, v.input),
  );

export const useDeleteWork = () => useWorkMutation<string>((id) => api.works.remove(id));

export const usePublishWork = () =>
  useWorkMutation<{ id: string; input?: WorkPublishInput }>((v) =>
    api.works.publish(v.id, v.input ?? {}),
  );

export const useUnpublishWork = () =>
  useWorkMutation<string>((id) => api.works.unpublish(id));

/** Pull a finished order's photo into the portfolio. */
export const useAdoptOrderPhoto = () =>
  useWorkMutation<{ orderPhotoId: string; input?: WorkAdoptInput }>((v) =>
    api.works.adoptOrderPhoto(v.orderPhotoId, v.input ?? {}),
  );

/**
 * Development only. Seeds a fake inbound enquiry so the chat loop is testable
 * before the client app ships. The endpoint 403s in production.
 */
export function useSimulateEnquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.conversations.simulateEnquiry(),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.conversations() }),
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

/**
 * Per-type mutes (role-neutral, keyed by user).
 *
 * Distinct from useNotificationPreferences, which is the tailor-only reminder
 * SCHEDULE (lead days, reminder hour, timezone). These two look similar in the
 * UI and are deliberately different tables — see migration 20260808210000.
 */
export const useNotificationSettings = () =>
  useQuery({
    queryKey: [...qk.notifications(), 'settings'],
    queryFn: () => api.notifications.getSettings(),
  });

export function useUpdateNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { mutedTypes: NotificationType[] }) =>
      api.notifications.updateSettings(input),
    // Optimistic: a toggle that waits for a round trip feels broken.
    onMutate: async (input) => {
      const key = [...qk.notifications(), 'settings'];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, input);
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.notifications() }),
  });
}
