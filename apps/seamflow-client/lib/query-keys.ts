// ============================================================================
// Query keys — single source of truth so mutations can invalidate the right
// caches. Consumer (seamflow-client) surface.
// ============================================================================

export const qk = {
  health: () => ['health'] as const,

  consumerOrders: () => ['consumer', 'orders'] as const,
  consumerOrder: (id: string) => ['consumer', 'orders', id] as const,
  consumerMeasurements: () => ['consumer', 'measurements'] as const,
} as const;
