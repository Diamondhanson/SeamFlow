import { z } from 'zod';
import type { Client } from './client';
import type { MeasurementSet } from './measurement';
import type { MeasurementTemplate } from './template';
import type { GroupOrder, GroupOrderMember } from './group-order';
import type { Order, OrderItem } from './order';
import type { OrderPhoto } from './order-photo';

/** WatermelonDB-style change set for a single table. */
export interface SyncTableChanges<T> {
  created: T[];
  updated: T[];
  deleted: string[];
}

export const SyncPullRequestSchema = z.object({
  /** ISO datetime of the previous successful pull. Omit on first sync. */
  lastPulledAt: z.string().datetime().nullable().optional(),
});
export type SyncPullRequest = z.infer<typeof SyncPullRequestSchema>;

/**
 * Response shape for POST /sync/pull. `timestamp` is the server's clock at
 * the START of the read — use it as the next `lastPulledAt` to guarantee
 * no rows are missed even if the request takes time.
 */
export interface SyncPullResponse {
  timestamp: string;
  changes: {
    clients: SyncTableChanges<Client>;
    measurementSets: SyncTableChanges<MeasurementSet>;
    measurementTemplates: SyncTableChanges<MeasurementTemplate>;
    groupOrders: SyncTableChanges<GroupOrder>;
    groupOrderMembers: SyncTableChanges<GroupOrderMember>;
    orders: SyncTableChanges<Order>;
    orderItems: SyncTableChanges<OrderItem>;
    orderPhotos: SyncTableChanges<OrderPhoto>;
  };
}

export type SyncTableName = keyof SyncPullResponse['changes'];
