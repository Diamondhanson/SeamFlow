// ============================================================================
// Query keys — single source of truth so mutations can invalidate the right
// caches. Consumer (seamflow-client) surface.
// ============================================================================

export const qk = {
  health: () => ['health'] as const,
  me: () => ['me'] as const,

  consumerOrders: () => ['consumer', 'orders'] as const,
  consumerOrder: (id: string) => ['consumer', 'orders', id] as const,
  consumerMeasurements: () => ['consumer', 'measurements'] as const,

  // ── Discovery (ROADMAP Appendix D) ────────────────────────────────────────
  feed: (filter?: Record<string, string | undefined>) =>
    ['feed', filter ?? {}] as const,
  feedPost: (id: string) => ['feed', id] as const,
  storefront: (tailorId: string) => ['storefront', tailorId] as const,
  // Keyed by slug, not id — the slug is all a deep link carries, and resolving
  // it to an id would mean a round-trip before the cache could even be checked.
  catalogue: (slug: string) => ['catalogue', slug] as const,

  // ── Requests: "Can you make this?" (ROADMAP appendix H) ───────────────────
  myRequests: () => ['requests', 'mine'] as const,
  myRequest: (id: string) => ['requests', 'mine', id] as const,
  requestOffers: (id: string) => ['requests', id, 'offers'] as const,

  // ── Chat ──────────────────────────────────────────────────────────────────
  conversations: () => ['conversations'] as const,
  conversation: (id: string) => ['conversations', id] as const,
  conversationMessages: (id: string) => ['conversations', id, 'messages'] as const,

  // ── Notification inbox ────────────────────────────────────────────────────
  notifications: () => ['notifications'] as const,
} as const;
