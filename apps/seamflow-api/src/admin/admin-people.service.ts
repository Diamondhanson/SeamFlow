// ============================================================================
// What staff can do TO a tailor, a client, or a post.
//
// Three rules hold across everything here.
//
//   1. Nothing destroys what someone made. Verification, sign-out, deletion
//      state and a post's visibility are all reversible or already someone
//      else's decision being carried out. The one exception is purge, which
//      only executes a deletion the person themselves asked for.
//   2. Every action is recorded against the person before it returns. See
//      AdminAuditService.
//   3. The person is told when the effect is visible to them. A post taken
//      down without a word is how a platform loses a tailor.
// ============================================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AccountService } from '../account/account.service';
import { AccountPurgeService } from '../account/account-purge.service';
import { AdminAuditService } from './admin-audit.service';
import { feedPosts, tailors, users } from '../db/schema';

@Injectable()
export class AdminPeopleService {
  private readonly logger = new Logger(AdminPeopleService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly account: AccountService,
    private readonly purge: AccountPurgeService,
    private readonly audit: AdminAuditService,
  ) {}

  private get db() {
    return this.dbService.db;
  }

  /**
   * The verified badge.
   *
   * A trust signal shown on the storefront and in the feed, so it is staff's
   * to give and to take back. Recorded both ways: "who verified this shop" is
   * a question that gets asked later.
   */
  async setVerified(actorUserId: string, tailorId: string, verified: boolean) {
    const [shop] = await this.db
      .select({ id: tailors.id, isVerified: tailors.isVerified, userId: tailors.userId })
      .from(tailors)
      .where(eq(tailors.id, tailorId))
      .limit(1);
    if (!shop) throw new NotFoundException('Tailor not found');

    await this.db.update(tailors).set({ isVerified: verified }).where(eq(tailors.id, tailorId));
    await this.audit.record(actorUserId, verified ? 'tailor.verify' : 'tailor.unverify', {
      type: 'tailor',
      id: tailorId,
    }, { was: shop.isVerified });
    return { isVerified: verified };
  }

  /**
   * End every session this person has.
   *
   * For a lost or stolen phone, and for an account someone else is inside.
   * They are not locked out: the next sign-in works normally. That is the
   * difference between this and a suspension, which is deliberately a
   * separate thing.
   */
  async signOutEverywhere(actorUserId: string, userId: string) {
    const [person] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!person) throw new NotFoundException('User not found');

    const { error } = await this.supabase.admin().auth.admin.signOut(userId, 'global');
    if (error) {
      this.logger.warn(`Could not sign out ${userId}: ${error.message}`);
      throw new Error(error.message);
    }
    await this.audit.record(actorUserId, 'user.sign_out', { type: 'user', id: userId });
    return { ok: true };
  }

  /**
   * Stop a deletion that is counting down.
   *
   * People change their minds, or ask us to change it for them, and the 30-day
   * grace exists precisely so that is possible. Uses the same path the person
   * would have used themselves.
   */
  async cancelDeletion(actorUserId: string, userId: string) {
    const state = await this.account.cancelDeletion(userId);
    await this.audit.record(actorUserId, 'user.deletion_cancel', { type: 'user', id: userId });
    return state;
  }

  /**
   * Carry out a deletion now instead of waiting for the grace period.
   *
   * ONLY for an account whose owner has already asked to be deleted. Staff
   * cannot start a deletion for someone: an account belongs to the person who
   * made it, and the dashboard is not a way to take it from them.
   */
  async purgeNow(actorUserId: string, userId: string) {
    const [person] = await this.db
      .select({ requested: users.deletionRequestedAt, deleted: users.deletedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!person) throw new NotFoundException('User not found');
    if (person.deleted) return { purged: false, reason: 'already_purged' as const };
    if (!person.requested) {
      return { purged: false, reason: 'not_requested' as const };
    }
    await this.purge.purgeUser(userId);
    await this.audit.record(actorUserId, 'user.purge_now', { type: 'user', id: userId });
    return { purged: true };
  }

  /**
   * Stop an account from acting, without taking anything away.
   *
   * A suspended person can still read every client, order and measurement
   * they ever made, export it all, and write to support to argue. What they
   * cannot do is change anything: the auth guard refuses writes and hands
   * back this reason, which the app shows verbatim. So the reason has to be a
   * sentence a person can act on, not a code.
   */
  async setSuspended(
    actorUserId: string,
    userId: string,
    suspended: boolean,
    reason: string | null,
  ) {
    const [person] = await this.db
      .select({ id: users.id, at: users.suspendedAt, reason: users.suspensionReason })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!person) throw new NotFoundException('User not found');

    await this.db
      .update(users)
      .set({
        suspendedAt: suspended ? new Date() : null,
        suspensionReason: suspended ? reason : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await this.audit.record(
      actorUserId,
      suspended ? 'user.suspend' : 'user.restore',
      { type: 'user', id: userId },
      { reason, wasSuspendedAt: person.at?.toISOString() ?? null },
    );

    // Their devices keep whatever they had cached, and the next write will be
    // refused with the reason. Telling them directly is better than letting
    // them find out by pressing something.
    void this.notifications.emit(userId, {
      type: 'moderation.outcome',
      params: { reason: reason ?? '' },
      entity: null,
    });

    return { suspended, reason };
  }

  /**
   * Take a post out of the feed, and say so.
   *
   * 'removed' already existed in the schema with no way to set it, and
   * `moderation.outcome` already existed as a notification with nothing that
   * sent it. A takedown the tailor has to discover for themselves is the
   * version of this that makes people leave.
   */
  async takedownPost(actorUserId: string, postId: string, reason: string, restore = false) {
    const [post] = await this.db
      .select({ id: feedPosts.id, status: feedPosts.status, tailorId: feedPosts.tailorId })
      .from(feedPosts)
      .where(eq(feedPosts.id, postId))
      .limit(1);
    if (!post) throw new NotFoundException('Post not found');

    const status = restore ? 'published' : 'removed';
    await this.db.update(feedPosts).set({ status }).where(eq(feedPosts.id, postId));
    await this.audit.record(
      actorUserId,
      restore ? 'post.restore' : 'post.takedown',
      { type: 'feed_post', id: postId },
      { reason, was: post.status, tailorId: post.tailorId },
    );

    // Tell the tailor. Persisted AND pushed: this is their work disappearing.
    const [shop] = await this.db
      .select({ userId: tailors.userId })
      .from(tailors)
      .where(eq(tailors.id, post.tailorId))
      .limit(1);
    if (shop?.userId && !restore) {
      void this.notifications.emit(shop.userId, {
        type: 'moderation.outcome',
        params: { reason },
        entity: null,
      });
    }
    return { status };
  }
}
