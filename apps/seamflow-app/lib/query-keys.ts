import type { OrderStatus } from '@seamflow/schemas';

// ============================================================================
// Query keys — single source of truth so mutations can invalidate the right
// caches and `mutation-defaults.ts` can reference them without a circular
// import on `queries.ts`.
// ============================================================================

export const qk = {
  health: () => ['health'] as const,
  me: () => ['me'] as const,
  myTailor: () => ['me', 'tailor'] as const,

  clients: (q?: string) => ['clients', { q: q ?? '' }] as const,
  client: (id: string) => ['clients', id] as const,
  measurementSets: (clientId: string) =>
    ['clients', clientId, 'measurement-sets'] as const,

  templates: () => ['templates'] as const,
  template: (id: string) => ['templates', id] as const,

  fabrics: () => ['fabrics'] as const,
  fabric: (id: string) => ['fabrics', id] as const,

  groups: (status?: string) => ['groups', { status: status ?? '' }] as const,
  group: (id: string) => ['groups', id] as const,

  orders: (filter?: {
    clientId?: string;
    status?: OrderStatus;
    q?: string;
    dueBefore?: string;
    dueAfter?: string;
  }) =>
    ['orders', filter ?? {}] as const,
  order: (id: string) => ['orders', id] as const,
  orderPhotos: (orderId: string) => ['orders', orderId, 'photos'] as const,

  designs: () => ['designs'] as const,
  design: (id: string) => ['designs', id] as const,

  invoices: () => ['invoices'] as const,
  invoice: (id: string) => ['invoices', id] as const,

  notificationPreferences: () => ['notification-preferences'] as const,
} as const;
