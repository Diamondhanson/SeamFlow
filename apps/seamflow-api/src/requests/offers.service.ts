// ============================================================================
// Offers — a tailor's answer, and the client's choice.
//
// The whole feature turns on `accept`: everything before it is a board, and
// everything after it is the app's existing order flow. Accepting has to do
// three things atomically or the result is a mess someone has to untangle by
// hand — mark the winner, decline the rest, and open the conversation the two
// of them continue in.
// ============================================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ne } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { conversations, feedPosts, offers, requests, tailors } from '../db/schema';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestsService } from './requests.service';
import { REQUEST_LIMITS } from './requests.config';
import type { OfferCreateInput } from '@seamflow/schemas';

export type OfferRow = typeof offers.$inferSelect;

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly requestsService: RequestsService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Answer a request.
   *
   * Four gates, in cost order — eligibility and state before the daily cap,
   * because a tailor blocked by the cap should still not learn whether a
   * request they cannot see exists.
   */
  async create(
    tailorId: string,
    requestId: string,
    input: OfferCreateInput,
  ): Promise<OfferRow> {
    const request = await this.requestsService.assertOfferable(requestId);

    if (!(await this.requestsService.isEligible(tailorId, request))) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    const [existing] = await this.dbService.db
      .select({ id: offers.id })
      .from(offers)
      .where(and(eq(offers.requestId, requestId), eq(offers.tailorId, tailorId)))
      .limit(1);
    if (existing) {
      throw new BadRequestException('You have already made an offer on this request');
    }

    const today = await this.requestsService.countOffersToday(tailorId);
    if (today >= REQUEST_LIMITS.MAX_OFFERS_PER_TAILOR_PER_DAY) {
      throw new ForbiddenException(
        `That is ${REQUEST_LIMITS.MAX_OFFERS_PER_TAILOR_PER_DAY} offers today. ` +
          'Come back tomorrow — a considered offer beats a fast one.',
      );
    }

    // A sample must be the tailor's own published work. Otherwise an offer
    // could attach somebody else's photograph as evidence of their skill.
    if (input.samplePostId) {
      const [post] = await this.dbService.db
        .select({ id: feedPosts.id })
        .from(feedPosts)
        .where(and(eq(feedPosts.id, input.samplePostId), eq(feedPosts.tailorId, tailorId)))
        .limit(1);
      if (!post) throw new NotFoundException('That sample is not one of your posts');
    }

    const [tailor] = await this.dbService.db
      .select({ currency: tailors.currency })
      .from(tailors)
      .where(eq(tailors.id, tailorId))
      .limit(1);

    const [row] = await this.dbService.db
      .insert(offers)
      .values({
        requestId,
        tailorId,
        price: input.price != null ? String(input.price) : null,
        priceMax: input.priceMax != null ? String(input.priceMax) : null,
        // Fall back to the tailor's own currency — an offer priced in nothing
        // cannot be compared with one priced in something.
        currency: input.currency ?? tailor?.currency ?? null,
        message: input.message,
        samplePostId: input.samplePostId ?? null,
      })
      .returning();
    if (!row) throw new NotFoundException('Insert returned no row');

    await this.requestsService.bumpOfferCount(requestId);

    void this.notifications
      .emit(request.clientUserId, {
        type: 'offer.received',
        entity: { type: 'request', id: requestId },
        params: { garmentType: request.garmentType },
      })
      .catch((err) => this.logger.warn(`offer.received notify failed: ${err.message}`));

    return row;
  }

  async listForRequest(clientUserId: string, requestId: string): Promise<OfferRow[]> {
    // Ownership check lives in getForClient — a client may only read offers on
    // their own request.
    await this.requestsService.getForClient(clientUserId, requestId);
    return this.dbService.db
      .select()
      .from(offers)
      .where(and(eq(offers.requestId, requestId), ne(offers.status, 'withdrawn')))
      .orderBy(desc(offers.createdAt));
  }

  async listMine(tailorId: string): Promise<OfferRow[]> {
    return this.dbService.db
      .select()
      .from(offers)
      .where(eq(offers.tailorId, tailorId))
      .orderBy(desc(offers.createdAt));
  }

  async withdraw(tailorId: string, offerId: string): Promise<OfferRow> {
    const [row] = await this.dbService.db
      .select()
      .from(offers)
      .where(and(eq(offers.id, offerId), eq(offers.tailorId, tailorId)))
      .limit(1);
    if (!row) throw new NotFoundException(`Offer ${offerId} not found`);
    if (row.status === 'accepted') {
      throw new BadRequestException('This offer was already accepted — talk to the client');
    }

    const [updated] = await this.dbService.db
      .update(offers)
      .set({ status: 'withdrawn', updatedAt: new Date() })
      .where(eq(offers.id, offerId))
      .returning();
    return updated!;
  }

  async shortlist(clientUserId: string, offerId: string): Promise<OfferRow> {
    const row = await this.getOwnedByClient(clientUserId, offerId);
    if (row.status !== 'sent') {
      throw new BadRequestException('Only a new offer can be shortlisted');
    }
    const [updated] = await this.dbService.db
      .update(offers)
      .set({ status: 'shortlisted', updatedAt: new Date() })
      .where(eq(offers.id, offerId))
      .returning();
    return updated!;
  }

  /**
   * Pick a tailor.
   *
   * One transaction, because a half-applied accept is genuinely bad: an
   * accepted offer with no conversation strands both people, and declining the
   * others without marking a winner tells everybody they lost.
   *
   * The conversation is REUSED if these two are already talking. A client who
   * enquired about a feed post last week and now accepts that tailor's offer
   * should continue the same thread, not start a second one that splits the
   * history of a single relationship in half.
   */
  async accept(
    clientUserId: string,
    offerId: string,
  ): Promise<{ offer: OfferRow; conversationId: string; declinedCount: number }> {
    const offer = await this.getOwnedByClient(clientUserId, offerId);
    if (offer.status === 'accepted') {
      throw new BadRequestException('You already accepted this offer');
    }
    if (offer.status === 'withdrawn') {
      throw new BadRequestException('That tailor withdrew this offer');
    }

    const request = await this.requestsService.getForClient(clientUserId, offer.requestId);
    if (request.status === 'fulfilled') {
      throw new BadRequestException('You already picked a tailor for this request');
    }

    const result = await this.dbService.db.transaction(async (tx) => {
      const [existingThread] = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.clientUserId, clientUserId),
            eq(conversations.tailorId, offer.tailorId),
          ),
        )
        .limit(1);

      let conversationId = existingThread?.id;
      if (!conversationId) {
        const [thread] = await tx
          .insert(conversations)
          .values({
            clientUserId,
            tailorId: offer.tailorId,
            origin: 'request',
            requestId: request.id,
            offerId: offer.id,
            lastMessageAt: new Date(),
            lastMessagePreview: offer.message.slice(0, 140),
          })
          .returning({ id: conversations.id });
        conversationId = thread!.id;
      } else {
        // Point the existing thread at what just happened, so the tailor's
        // inbox shows why it came back to life.
        await tx
          .update(conversations)
          .set({ requestId: request.id, offerId: offer.id, lastMessageAt: new Date() })
          .where(eq(conversations.id, conversationId));
      }

      const [accepted] = await tx
        .update(offers)
        .set({ status: 'accepted', conversationId, updatedAt: new Date() })
        .where(eq(offers.id, offerId))
        .returning();

      const declined = await tx
        .update(offers)
        .set({ status: 'declined', updatedAt: new Date() })
        .where(
          and(
            eq(offers.requestId, request.id),
            ne(offers.id, offerId),
            ne(offers.status, 'withdrawn'),
          ),
        )
        .returning({ id: offers.id, tailorId: offers.tailorId });

      await tx
        .update(requests)
        .set({ status: 'fulfilled', acceptingOffers: false, updatedAt: new Date() })
        .where(eq(requests.id, request.id));

      return { offer: accepted!, conversationId, declined };
    });

    // Notifications are outside the transaction on purpose: a push that fails
    // must not roll back a commission that succeeded.
    void this.notifyAfterAccept(result.offer, result.declined, request.garmentType);

    return {
      offer: result.offer,
      conversationId: result.conversationId,
      declinedCount: result.declined.length,
    };
  }

  private async notifyAfterAccept(
    accepted: OfferRow,
    declined: { tailorId: string }[],
    garmentType: string,
  ): Promise<void> {
    const userIdFor = async (tailorId: string) => {
      const [t] = await this.dbService.db
        .select({ userId: tailors.userId })
        .from(tailors)
        .where(eq(tailors.id, tailorId))
        .limit(1);
      return t?.userId ?? null;
    };

    try {
      const winner = await userIdFor(accepted.tailorId);
      if (winner) {
        await this.notifications.emit(winner, {
          type: 'offer.accepted',
          entity: { type: 'offer', id: accepted.id },
          params: { garmentType },
        });
      }

      // The losing tailors are told too. Silence after writing a considered
      // offer is the thing that makes people stop answering a board.
      for (const d of declined) {
        const userId = await userIdFor(d.tailorId);
        if (!userId) continue;
        await this.notifications.emit(userId, {
          type: 'offer.declined',
          entity: { type: 'request', id: accepted.requestId },
          params: { garmentType },
        });
      }
    } catch (err) {
      this.logger.warn(`accept notifications failed: ${(err as Error).message}`);
    }
  }

  private async getOwnedByClient(clientUserId: string, offerId: string): Promise<OfferRow> {
    const [row] = await this.dbService.db
      .select({ offer: offers, clientUserId: requests.clientUserId })
      .from(offers)
      .innerJoin(requests, eq(requests.id, offers.requestId))
      .where(eq(offers.id, offerId))
      .limit(1);
    if (!row || row.clientUserId !== clientUserId) {
      throw new NotFoundException(`Offer ${offerId} not found`);
    }
    return row.offer;
  }
}
