// ============================================================================
// Every staff action, written down.
//
// The dashboard can now change things about real people. That is only
// acceptable if each change leaves a trail: who did it, to whom, when, and
// what it was before. A record like that is what turns "the platform suspended
// my shop" from an argument into a fact.
//
// Recording never blocks the action it describes. If the write fails, the
// action still happened and the failure is logged loudly — a lost audit row is
// bad, but refusing to cancel someone's account deletion because a log write
// timed out is worse.
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { adminActions, users } from '../db/schema';

export type AuditTargetType = 'tailor' | 'user' | 'feed_post' | 'platform';

export interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  targetType: string;
  targetId: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
}

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(private readonly dbService: DbService) {}

  async record(
    actorUserId: string,
    action: string,
    target: { type: AuditTargetType; id?: string | null },
    detail: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await this.dbService.db.insert(adminActions).values({
        actorUserId,
        action,
        targetType: target.type,
        targetId: target.id ?? null,
        detail,
      });
    } catch (err) {
      this.logger.error(
        `Could not record admin action ${action} on ${target.type}:${target.id ?? '-'} — ${(err as Error).message}`,
      );
    }
  }

  /** History for one person or post, newest first. */
  async forTarget(type: AuditTargetType, id: string, limit = 50): Promise<AuditEntry[]> {
    const rows = await this.dbService.db
      .select({
        id: adminActions.id,
        action: adminActions.action,
        actorEmail: users.email,
        targetType: adminActions.targetType,
        targetId: adminActions.targetId,
        detail: adminActions.detail,
        createdAt: adminActions.createdAt,
      })
      .from(adminActions)
      .leftJoin(users, eq(users.id, adminActions.actorUserId))
      .where(and(eq(adminActions.targetType, type), eq(adminActions.targetId, id)))
      .orderBy(desc(adminActions.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      actor: r.actorEmail ?? 'unknown',
      targetType: r.targetType,
      targetId: r.targetId,
      detail: (r.detail ?? {}) as Record<string, unknown>,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** The platform-wide feed, for the dashboard's own history page. */
  async recent(limit = 100): Promise<AuditEntry[]> {
    const rows = await this.dbService.db
      .select({
        id: adminActions.id,
        action: adminActions.action,
        actorEmail: users.email,
        targetType: adminActions.targetType,
        targetId: adminActions.targetId,
        detail: adminActions.detail,
        createdAt: adminActions.createdAt,
      })
      .from(adminActions)
      .leftJoin(users, eq(users.id, adminActions.actorUserId))
      .orderBy(desc(adminActions.createdAt))
      .limit(Math.min(Math.max(limit, 1), 500));
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      actor: r.actorEmail ?? 'unknown',
      targetType: r.targetType,
      targetId: r.targetId,
      detail: (r.detail ?? {}) as Record<string, unknown>,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
