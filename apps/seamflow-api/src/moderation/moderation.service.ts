// ============================================================================
// Moderation — the two things a user-generated-content platform owes people.
//
// REPORTING is how someone tells us something is wrong. It is reactive: nothing
// is screened before it appears, a human reads the queue, and the remedies are
// the staff actions that already exist (take the post down, suspend the shop).
// A queue nobody reads would be worse than no queue, so this one is small,
// de-duplicated, and ordered the single way it is actually worked.
//
// BLOCKING is how someone makes it stop without waiting for us. It is private,
// immediate, and symmetric — neither side can message the other afterwards.
// Nobody is told they have been blocked, because the point is to end contact,
// not to start an argument about it.
//
// The two are deliberately independent. Reporting without blocking leaves you
// still receiving messages while you wait; blocking without reporting leaves us
// never learning that a shop is stealing photographs. People do one, the other,
// or both, and neither implies the other.
// ============================================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import type {
  BlockedUser,
  ContentReport,
  CreateReportInput,
  DecideReportInput,
  ReportTarget,
} from '@seamflow/schemas';
import { DbService } from '../db/db.service';
import {
  contentReports,
  conversations,
  feedPosts,
  messages,
  tailors,
  userBlocks,
  users,
} from '../db/schema';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(private readonly dbService: DbService) {}

  // -------------------------------------------------------------------------
  // Reporting
  // -------------------------------------------------------------------------

  /**
   * File a report.
   *
   * Checks the target exists, because a report about nothing wastes the one
   * scarce resource here — a person's attention. Beyond that it asks no
   * questions: whether the complaint is right is the reviewer's job, and a
   * form that argued with the reporter would simply stop people reporting.
   */
  async report(userId: string, input: CreateReportInput): Promise<{ id: string }> {
    const db = this.dbService.db;

    const exists = await this.targetExists(input.target, input.targetId);
    if (!exists) {
      throw new NotFoundException('That content no longer exists.');
    }

    // Reporting your own content is always a mistake or a test. Refusing is
    // kinder than a queue entry a reviewer has to work out the meaning of.
    if (await this.ownsTarget(userId, input.target, input.targetId)) {
      throw new BadRequestException('You cannot report your own content.');
    }

    // One open report per person per thing. The unique index enforces it; this
    // turns the collision into the honest answer rather than a 500. Reporting
    // twice is a slip, not a stronger signal.
    const existing = await db
      .select({ id: contentReports.id })
      .from(contentReports)
      .where(
        and(
          eq(contentReports.reporterUserId, userId),
          eq(contentReports.target, input.target),
          eq(contentReports.targetId, input.targetId),
          eq(contentReports.status, 'open'),
        ),
      )
      .limit(1);
    if (existing[0]) return { id: existing[0].id };

    const [row] = await db
      .insert(contentReports)
      .values({
        reporterUserId: userId,
        target: input.target,
        targetId: input.targetId,
        reason: input.reason,
        note: input.note?.trim() || null,
      })
      .returning({ id: contentReports.id });

    this.logger.log(`Report ${row!.id}: ${input.target} ${input.targetId} (${input.reason})`);
    return { id: row!.id };
  }

  /** Does the thing being reported still exist? */
  private async targetExists(target: ReportTarget, id: string): Promise<boolean> {
    const db = this.dbService.db;
    if (target === 'design') {
      const [r] = await db.select({ id: feedPosts.id }).from(feedPosts).where(eq(feedPosts.id, id)).limit(1);
      return Boolean(r);
    }
    if (target === 'shop') {
      const [r] = await db.select({ id: tailors.id }).from(tailors).where(eq(tailors.id, id)).limit(1);
      return Boolean(r);
    }
    const [r] = await db.select({ id: messages.id }).from(messages).where(eq(messages.id, id)).limit(1);
    return Boolean(r);
  }

  /** Is the reporter the author of the thing they are reporting? */
  private async ownsTarget(userId: string, target: ReportTarget, id: string): Promise<boolean> {
    const db = this.dbService.db;
    if (target === 'message') {
      const [r] = await db
        .select({ sender: messages.senderUserId })
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);
      return r?.sender === userId;
    }
    const tailorId =
      target === 'shop'
        ? id
        : (
            await db
              .select({ t: feedPosts.tailorId })
              .from(feedPosts)
              .where(eq(feedPosts.id, id))
              .limit(1)
          )[0]?.t;
    if (!tailorId) return false;
    const [owner] = await db
      .select({ userId: tailors.userId })
      .from(tailors)
      .where(eq(tailors.id, tailorId))
      .limit(1);
    return owner?.userId === userId;
  }

  // -------------------------------------------------------------------------
  // The staff queue
  // -------------------------------------------------------------------------

  async queue(status: 'open' | 'actioned' | 'dismissed' = 'open'): Promise<ContentReport[]> {
    const db = this.dbService.db;
    const rows = await db
      .select({
        id: contentReports.id,
        target: contentReports.target,
        targetId: contentReports.targetId,
        reason: contentReports.reason,
        note: contentReports.note,
        status: contentReports.status,
        createdAt: contentReports.createdAt,
        reviewedAt: contentReports.reviewedAt,
        decisionNote: contentReports.decisionNote,
        reporterUserId: contentReports.reporterUserId,
        reporterName: users.fullName,
        reporterEmail: users.email,
      })
      .from(contentReports)
      .leftJoin(users, eq(users.id, contentReports.reporterUserId))
      .where(eq(contentReports.status, status))
      .orderBy(desc(contentReports.createdAt))
      .limit(200);

    // Resolve what each report is ABOUT in one pass per kind, rather than a
    // query per row. A reviewer needs the picture and the words in front of
    // them; making them open three tabs is how a queue stops being worked.
    const subjects = await this.subjectsFor(rows.map((r) => ({ target: r.target as ReportTarget, id: r.targetId })));

    return rows.map((r) => ({
      id: r.id,
      target: r.target as ReportTarget,
      targetId: r.targetId,
      reason: r.reason as ContentReport['reason'],
      note: r.note,
      status: r.status as ContentReport['status'],
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      decisionNote: r.decisionNote,
      reporter: {
        userId: r.reporterUserId ?? '00000000-0000-0000-0000-000000000000',
        name: r.reporterName || null,
        email: r.reporterEmail,
      },
      subject: subjects.get(`${r.target}:${r.targetId}`) ?? null,
    }));
  }

  async openCount(): Promise<number> {
    const [row] = await this.dbService.db
      .select({ n: sql<number>`count(*)::int` })
      .from(contentReports)
      .where(eq(contentReports.status, 'open'));
    return row?.n ?? 0;
  }

  /** Batch-resolve the reported things into something readable. */
  private async subjectsFor(
    targets: { target: ReportTarget; id: string }[],
  ): Promise<Map<string, ContentReport['subject']>> {
    const db = this.dbService.db;
    const out = new Map<string, ContentReport['subject']>();
    const ids = (k: ReportTarget) => targets.filter((t) => t.target === k).map((t) => t.id);

    const designIds = ids('design');
    if (designIds.length) {
      const rows = await db
        .select({
          id: feedPosts.id,
          title: feedPosts.title,
          caption: feedPosts.caption,
          thumb: feedPosts.publicThumbPath,
          path: feedPosts.publicPath,
          tailorId: feedPosts.tailorId,
          ownerUserId: tailors.userId,
          shop: tailors.businessName,
        })
        .from(feedPosts)
        .leftJoin(tailors, eq(tailors.id, feedPosts.tailorId))
        .where(inArray(feedPosts.id, designIds));
      for (const r of rows) {
        out.set(`design:${r.id}`, {
          label: r.title || r.shop || 'Design',
          detail: r.caption,
          imagePath: r.thumb || r.path,
          tailorId: r.tailorId,
          ownerUserId: r.ownerUserId ?? null,
        });
      }
    }

    const shopIds = ids('shop');
    if (shopIds.length) {
      const rows = await db
        .select({
          id: tailors.id,
          name: tailors.businessName,
          city: tailors.city,
          avatar: tailors.avatarPath,
          userId: tailors.userId,
        })
        .from(tailors)
        .where(inArray(tailors.id, shopIds));
      for (const r of rows) {
        out.set(`shop:${r.id}`, {
          label: r.name,
          detail: r.city,
          imagePath: r.avatar,
          tailorId: r.id,
          ownerUserId: r.userId,
        });
      }
    }

    const messageIds = ids('message');
    if (messageIds.length) {
      const rows = await db
        .select({
          id: messages.id,
          body: messages.body,
          senderUserId: messages.senderUserId,
          senderName: users.fullName,
          tailorId: conversations.tailorId,
        })
        .from(messages)
        .leftJoin(users, eq(users.id, messages.senderUserId))
        .leftJoin(conversations, eq(conversations.id, messages.conversationId))
        .where(inArray(messages.id, messageIds));
      for (const r of rows) {
        out.set(`message:${r.id}`, {
          label: r.senderName || 'Message',
          detail: r.body,
          imagePath: null,
          tailorId: r.tailorId ?? null,
          ownerUserId: r.senderUserId,
        });
      }
    }

    return out;
  }

  /**
   * Record what a reviewer decided.
   *
   * Deliberately does NOT carry out the remedy. Taking a post down and
   * suspending an account are their own endpoints with their own audit trail,
   * and binding them to this one would mean every report had exactly one
   * possible response. The reviewer acts, then closes the report.
   */
  async decide(
    staffUserId: string,
    reportId: string,
    input: DecideReportInput,
  ): Promise<{ id: string; status: string }> {
    const result = await this.dbService.db
      .update(contentReports)
      .set({
        status: input.status,
        reviewedBy: staffUserId,
        reviewedAt: new Date(),
        decisionNote: input.note?.trim() || null,
      })
      .where(eq(contentReports.id, reportId))
      .returning({ id: contentReports.id, status: contentReports.status });

    const row = result[0];
    if (!row) throw new NotFoundException('Report not found.');
    return row;
  }

  // -------------------------------------------------------------------------
  // Blocking
  // -------------------------------------------------------------------------

  async block(blockerUserId: string, blockedUserId: string): Promise<void> {
    if (blockerUserId === blockedUserId) {
      throw new BadRequestException('You cannot block yourself.');
    }
    const [target] = await this.dbService.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, blockedUserId))
      .limit(1);
    if (!target) throw new NotFoundException('No such person.');

    // Blocking twice is the same state, not an error — the button may well be
    // tapped from a stale screen.
    await this.dbService.db
      .insert(userBlocks)
      .values({ blockerUserId, blockedUserId })
      .onConflictDoNothing();
  }

  async unblock(blockerUserId: string, blockedUserId: string): Promise<void> {
    await this.dbService.db
      .delete(userBlocks)
      .where(
        and(eq(userBlocks.blockerUserId, blockerUserId), eq(userBlocks.blockedUserId, blockedUserId)),
      );
  }

  /** Who this person has blocked, for the list in Settings. */
  async blocked(userId: string): Promise<BlockedUser[]> {
    const rows = await this.dbService.db
      .select({
        userId: users.id,
        name: users.fullName,
        shopName: tailors.businessName,
        tailorId: tailors.id,
        avatarPath: tailors.avatarPath,
        blockedAt: userBlocks.createdAt,
      })
      .from(userBlocks)
      .innerJoin(users, eq(users.id, userBlocks.blockedUserId))
      .leftJoin(tailors, eq(tailors.userId, users.id))
      .where(eq(userBlocks.blockerUserId, userId))
      .orderBy(desc(userBlocks.createdAt));

    return rows.map((r) => ({
      userId: r.userId,
      name: r.name || null,
      shopName: r.shopName ?? null,
      tailorId: r.tailorId ?? null,
      avatarPath: r.avatarPath ?? null,
      blockedAt: r.blockedAt.toISOString(),
    }));
  }

  /**
   * Is there a block between these two, in EITHER direction?
   *
   * One question, not two, because messaging is the thing being stopped and it
   * has two ends. A block that only silenced the incoming half would leave the
   * blocker still able to talk at someone who cannot reply — the opposite of
   * what they asked for.
   */
  async blockedBetween(a: string, b: string): Promise<boolean> {
    const [row] = await this.dbService.db
      .select({ x: userBlocks.blockerUserId })
      .from(userBlocks)
      .where(
        or(
          and(eq(userBlocks.blockerUserId, a), eq(userBlocks.blockedUserId, b)),
          and(eq(userBlocks.blockerUserId, b), eq(userBlocks.blockedUserId, a)),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

}
