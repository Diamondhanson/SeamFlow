// ============================================================================
// Query keys — single source of truth so mutations can invalidate the right
// caches. Consumer (seamflow-client) surface.
// ============================================================================

export const qk = {
  health: () => ['health'] as const,

  consumerOrders: () => ['consumer', 'orders'] as const,
  consumerOrder: (id: string) => ['consumer', 'orders', id] as const,
  consumerMeasurements: () => ['consumer', 'measurements'] as const,

  // ── Discovery (ROADMAP Appendix D) ────────────────────────────────────────
  feed: (filter?: Record<string, string | undefined>) =>
    ['feed', filter ?? {}] as const,
  feedPost: (id: string) => ['feed', id] as const,
  storefront: (tailorId: string) => ['storefront', tailorId] as const,

  // ── Chat ──────────────────────────────────────────────────────────────────
  conversations: () => ['conversations'] as const,
  conversation: (id: string) => ['conversations', id] as const,
  conversationMessages: (id: string) => ['conversations', id, 'messages'] as const,
} as const;
