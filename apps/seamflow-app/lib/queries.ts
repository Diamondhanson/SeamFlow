import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Client,
  ClientCreateInput,
  ClientUpdateInput,
  GroupOrder,
  GroupOrderCreateInput,
  GroupOrderMemberCreateInput,
  GroupOrderMemberUpdateInput,
  GroupOrderUpdateInput,
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

// ============================================================================
// Query keys
// Single source of truth so mutations can invalidate the right caches.
// ============================================================================

export const qk = {
  health: () => ['health'] as const,
  me: () => ['me'] as const,
  myTailor: () => ['me', 'tailor'] as const,

  clients: (q?: string) => ['clients', { q: q ?? '' }] as const,
  client: (id: string) => ['clients', id] as const,
  measurementSets: (clientId: string) => ['clients', clientId, 'measurement-sets'] as const,

  templates: () => ['templates'] as const,
  template: (id: string) => ['templates', id] as const,

  groups: (status?: string) => ['groups', { status: status ?? '' }] as const,
  group: (id: string) => ['groups', id] as const,

  orders: (filter?: { clientId?: string; status?: OrderStatus }) =>
    ['orders', filter ?? {}] as const,
  order: (id: string) => ['orders', id] as const,
  orderPhotos: (orderId: string) => ['orders', orderId, 'photos'] as const,
} as const;

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

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientCreateInput) => api.clients.create(input),
    onSuccess: (created: Client) => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.setQueryData(qk.client(created.id), created);
    },
  });
}

export function useUpdateClient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientUpdateInput) => api.clients.update(id, input),
    onSuccess: (updated: Client) => {
      qc.setQueryData(qk.client(id), updated);
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeleteClient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.clients.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.removeQueries({ queryKey: qk.client(id) });
    },
  });
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

export const useOrders = (filter?: { clientId?: string; status?: OrderStatus }) =>
  useQuery({
    queryKey: qk.orders(filter),
    queryFn: () => api.orders.list({ limit: 100, ...filter }),
  });

export const useOrder = (id: string) =>
  useQuery({ queryKey: qk.order(id), queryFn: () => api.orders.get(id), enabled: !!id });

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrderCreateInput) => api.orders.create(input),
    onSuccess: (created: Order) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      // Also clear the cached client detail so its orders section refreshes.
      qc.invalidateQueries({ queryKey: qk.client(created.clientId) });
    },
  });
}

export function useUpdateOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrderUpdateInput) => api.orders.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.order(id) });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useTransitionOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrderTransitionInput) => api.orders.transition(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.order(id) });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useDeleteOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.orders.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.removeQueries({ queryKey: qk.order(id) });
    },
  });
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
