import { Injectable } from '@nestjs/common';
import { and, eq, gt, inArray, lte, sql } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import {
  clients,
  groupOrderMembers,
  groupOrders,
  measurementSets,
  measurementTemplates,
  orderItems,
  orderPhotos,
  orders,
  syncTombstones,
} from '../db/schema';

type Row = Record<string, unknown>;

interface TableChanges {
  created: Row[];
  updated: Row[];
  deleted: string[];
}

export interface SyncPullResult {
  timestamp: string;
  changes: {
    clients: TableChanges;
    measurementSets: TableChanges;
    measurementTemplates: TableChanges;
    groupOrders: TableChanges;
    groupOrderMembers: TableChanges;
    orders: TableChanges;
    orderItems: TableChanges;
    orderPhotos: TableChanges;
  };
}

@Injectable()
export class SyncService {
  constructor(private readonly dbService: DbService) {}

  /**
   * Returns all changes visible to this tailor since `lastPulledAt`.
   * If `lastPulledAt` is null/undefined, every row is treated as "created".
   *
   * Implementation note: `timestamp` is captured BEFORE the reads so that
   * a slow request doesn't cause a row created mid-read to be missed on the
   * next pull (it'll have updated_at > timestamp).
   */
  async pull(tailorId: string, lastPulledAt: string | null | undefined): Promise<SyncPullResult> {
    const since = lastPulledAt ? new Date(lastPulledAt) : null;
    // Server-side `now()` so we don't depend on the client's clock for the
    // next-pull boundary. ISO format so the value can be sent right back as
    // `lastPulledAt` on the next pull.
    const [{ now }] = await this.dbService.db.execute<{ now: Date }>(
      sql`select now() as now`,
    );
    const timestamp = (now instanceof Date ? now : new Date(now)).toISOString();

    const [
      clientRows,
      msetRows,
      mtmplRows,
      groupRows,
      memberRows,
      orderRows,
      itemRows,
      photoRows,
      tombstoneRows,
    ] = await Promise.all([
      // Top-level entities directly scoped by tailor_id
      this.dbService.db.select().from(clients).where(eq(clients.tailorId, tailorId)),
      // Children — scope via join
      this.dbService.db
        .select({ row: measurementSets })
        .from(measurementSets)
        .innerJoin(clients, eq(clients.id, measurementSets.clientId))
        .where(eq(clients.tailorId, tailorId))
        .then((rows) => rows.map((r) => r.row)),
      this.dbService.db
        .select()
        .from(measurementTemplates)
        .where(eq(measurementTemplates.tailorId, tailorId)),
      this.dbService.db
        .select()
        .from(groupOrders)
        .where(eq(groupOrders.tailorId, tailorId)),
      this.dbService.db
        .select({ row: groupOrderMembers })
        .from(groupOrderMembers)
        .innerJoin(groupOrders, eq(groupOrders.id, groupOrderMembers.groupOrderId))
        .where(eq(groupOrders.tailorId, tailorId))
        .then((rows) => rows.map((r) => r.row)),
      this.dbService.db.select().from(orders).where(eq(orders.tailorId, tailorId)),
      this.dbService.db
        .select({ row: orderItems })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(eq(orders.tailorId, tailorId))
        .then((rows) => rows.map((r) => r.row)),
      this.dbService.db
        .select({ row: orderPhotos })
        .from(orderPhotos)
        .innerJoin(orders, eq(orders.id, orderPhotos.orderId))
        .where(eq(orders.tailorId, tailorId))
        .then((rows) => rows.map((r) => r.row)),
      // Deletions — already scoped by tailor_id on the tombstone row
      this.dbService.db
        .select()
        .from(syncTombstones)
        .where(
          since
            ? and(eq(syncTombstones.tailorId, tailorId), gt(syncTombstones.deletedAt, since))
            : eq(syncTombstones.tailorId, tailorId),
        ),
    ]);

    const partition = (rows: Row[], createdKey = 'createdAt', updatedKey = 'updatedAt'): TableChanges => {
      const created: Row[] = [];
      const updated: Row[] = [];
      if (!since) {
        return { created: rows, updated, deleted: [] };
      }
      for (const r of rows) {
        const createdAt = r[createdKey] as Date | string;
        const updatedAt = r[updatedKey] as Date | string;
        const cAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
        const uAt = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
        if (cAt > since) {
          created.push(r);
        } else if (uAt > since) {
          updated.push(r);
        }
      }
      return { created, updated, deleted: [] };
    };

    const deletedIdsByEntity = new Map<string, string[]>();
    for (const t of tombstoneRows) {
      const list = deletedIdsByEntity.get(t.entityType) ?? [];
      list.push(t.entityId);
      deletedIdsByEntity.set(t.entityType, list);
    }
    const withDeletes = (changes: TableChanges, entityType: string): TableChanges => ({
      ...changes,
      deleted: deletedIdsByEntity.get(entityType) ?? [],
    });

    return {
      timestamp,
      changes: {
        clients: withDeletes(partition(clientRows), 'clients'),
        measurementSets: withDeletes(partition(msetRows), 'measurement_sets'),
        measurementTemplates: withDeletes(partition(mtmplRows), 'measurement_templates'),
        groupOrders: withDeletes(partition(groupRows), 'group_orders'),
        groupOrderMembers: withDeletes(partition(memberRows), 'group_order_members'),
        orders: withDeletes(partition(orderRows), 'orders'),
        // order_items has no updated_at — treat every row as 'created' when since-window
        // doesn't apply, otherwise nothing (clients shouldn't have stale items).
        orderItems: withDeletes(
          since ? { created: [], updated: [], deleted: [] } : { created: itemRows, updated: [], deleted: [] },
          'order_items',
        ),
        // order_photos has no updated_at either; same treatment.
        orderPhotos: withDeletes(
          since ? { created: [], updated: [], deleted: [] } : { created: photoRows, updated: [], deleted: [] },
          'order_photos',
        ),
      },
    };
  }
}

// Silence unused-import warnings for symbols imported only for type narrowing.
void lte;
void inArray;
