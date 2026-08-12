// ============================================================================
// Requests — "Can you make this?" (ROADMAP appendix H)
//
// A client posts a photo of the garment they want; tailors answer with offers;
// the client picks one and it becomes a conversation. The mirror of the
// discovery feed, and the direction that works before anyone has a portfolio.
//
// TWO IDEAS DO MOST OF THE WORK HERE, and they are easy to conflate:
//
//   ELIGIBILITY  who may OPEN a request. Broad on purpose — any tailor in the
//                area can answer something outside their usual work, because a
//                tag is a hint about a person, not a fence around them.
//   RECIPIENTS   who gets TOLD about it. Narrower, recorded, and the thing a
//                digest is built from.
//
// Tags guide notifications and ranking; they never hard-block browsing. Getting
// that backwards produces a board where a tailor cannot answer the job in front
// of them because they forgot to tick a chip.
// ============================================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, count, desc, eq, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import {
  offers,
  requestRecipients,
  requestTargets,
  requests,
  tailors,
} from '../db/schema';
import { SupabaseService } from '../supabase/supabase.service';
import { REQUEST_LIMITS } from './requests.config';
import type {
  RequestCreateInput,
  RequestQuery,
  RequestUpdateInput,
} from '@seamflow/schemas';

export type RequestRow = typeof requests.$inferSelect;

const REQUESTS_BUCKET = 'requests';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly supabase: SupabaseService,
  ) {}

  // =========================================================================
  // Client side
  // =========================================================================

  /**
   * Post a request.
   *
   * The caps are checked here rather than trusted from the app, and they are
   * checked BEFORE any storage work so a rejected post costs nothing.
   */
  async create(clientUserId: string, input: RequestCreateInput): Promise<RequestRow> {
    const db = this.dbService.db;

    const [{ openCount } = { openCount: 0 }] = await db
      .select({ openCount: count() })
      .from(requests)
      .where(and(eq(requests.clientUserId, clientUserId), eq(requests.status, 'open')));

    if (Number(openCount) >= REQUEST_LIMITS.MAX_OPEN_REQUESTS_PER_CLIENT) {
      throw new BadRequestException(
        `You already have ${REQUEST_LIMITS.MAX_OPEN_REQUESTS_PER_CLIENT} requests open. ` +
          'Close one before posting another.',
      );
    }

    // Cooldown. Deliberately measured from the last post rather than a rolling
    // window: the failure this prevents is a burst of near-identical requests,
    // not steady posting over a day.
    const [recent] = await db
      .select({ createdAt: requests.createdAt })
      .from(requests)
      .where(eq(requests.clientUserId, clientUserId))
      .orderBy(desc(requests.createdAt))
      .limit(1);

    if (recent) {
      const minutes = (Date.now() - new Date(recent.createdAt).getTime()) / 60_000;
      if (minutes < REQUEST_LIMITS.REQUEST_POST_COOLDOWN_MINUTES) {
        const wait = Math.ceil(REQUEST_LIMITS.REQUEST_POST_COOLDOWN_MINUTES - minutes);
        throw new BadRequestException(
          `Give it ${wait} more minute${wait === 1 ? '' : 's'} before posting again.`,
        );
      }
    }

    if (input.visibility === 'selected') {
      const found = await db
        .select({ id: tailors.id })
        .from(tailors)
        .where(inArray(tailors.id, input.tailorIds));
      if (found.length !== input.tailorIds.length) {
        throw new NotFoundException('One or more of those tailors was not found');
      }
    }

    const expiresAt = new Date(
      Date.now() + REQUEST_LIMITS.DEFAULT_REQUEST_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    const [row] = await db
      .insert(requests)
      .values({
        clientUserId,
        title: input.title ?? null,
        description: input.description,
        garmentType: input.garmentType,
        styleTags: input.styleTags,
        photos: input.photos,
        budgetMin: input.budgetMin != null ? String(input.budgetMin) : null,
        budgetMax: input.budgetMax != null ? String(input.budgetMax) : null,
        currency: input.currency ?? null,
        deadline: input.deadline ?? null,
        visibility: input.visibility,
        locationScope: input.locationScope ?? null,
        locationValue: input.locationValue ?? null,
        expiresAt,
      })
      .returning();
    if (!row) throw new NotFoundException('Insert returned no row');

    if (input.visibility === 'selected') {
      await db
        .insert(requestTargets)
        .values(input.tailorIds.map((tailorId) => ({ requestId: row.id, tailorId })));
    }

    await this.recordRecipients(row);
    return row;
  }

  /**
   * Work out who to tell, and record it.
   *
   * NOT ranked. Every eligible tailor is recorded as a recipient, because a
   * scoring function written against a board with no traffic would be tuned
   * against nothing and wrong in ways nobody could see. `MAX_REQUEST_FANOUT`
   * exists and is applied as a hard ceiling so the day this starts to bind is
   * a change to one function rather than a schema migration (ROADMAP H.3).
   *
   * Best-effort: a request that posts but fails to notify is recoverable; one
   * that fails to post because notification threw is not.
   */
  private async recordRecipients(request: RequestRow): Promise<void> {
    try {
      const db = this.dbService.db;

      if (request.visibility === 'selected') {
        const targets = await db
          .select({ tailorId: requestTargets.tailorId })
          .from(requestTargets)
          .where(eq(requestTargets.requestId, request.id));
        if (!targets.length) return;
        await db.insert(requestRecipients).values(
          targets.map((t) => ({
            requestId: request.id,
            tailorId: t.tailorId,
            reason: 'invited',
          })),
        );
        return;
      }

      const candidates = await db
        .select({ id: tailors.id, specialties: tailors.specialties })
        .from(tailors)
        .where(this.locationPredicate(request))
        .limit(REQUEST_LIMITS.MAX_REQUEST_FANOUT);

      if (!candidates.length) return;

      await db.insert(requestRecipients).values(
        candidates.map((c) => ({
          requestId: request.id,
          tailorId: c.id,
          // Recorded now so "why did I see this?" stays answerable once
          // ranking lands and the two stop being the same thing.
          reason: this.matchesSpeciality(c.specialties, request.garmentType)
            ? 'speciality'
            : 'location',
        })),
      );
    } catch (err) {
      this.logger.error(
        `Recipient fan-out failed for request ${request.id}: ${(err as Error).message}`,
      );
    }
  }

  private matchesSpeciality(specialties: unknown, garmentType: string): boolean {
    return Array.isArray(specialties) && specialties.includes(garmentType);
  }

  /**
   * Which tailors are in scope for a location request.
   *
   * `town` compares the tailor's city, the coarser scopes fall back to country.
   * There is no geocoding here on purpose: a text match on a city name is
   * crude, but it is honest about what the data actually contains, and a
   * distance calculation over addresses nobody has entered would be worse.
   */
  private locationPredicate(request: RequestRow) {
    const value = (request.locationValue ?? '').trim();
    if (!value) return sql`false`;
    if (request.locationScope === 'town') {
      return sql`lower(coalesce(${tailors.city}, '')) = lower(${value})`;
    }
    return sql`lower(coalesce(${tailors.countryCode}, '')) = lower(${value})`;
  }

  async listMine(clientUserId: string): Promise<RequestRow[]> {
    return this.dbService.db
      .select()
      .from(requests)
      .where(eq(requests.clientUserId, clientUserId))
      .orderBy(desc(requests.createdAt));
  }

  async getForClient(clientUserId: string, id: string): Promise<RequestRow> {
    const [row] = await this.dbService.db
      .select()
      .from(requests)
      .where(and(eq(requests.id, id), eq(requests.clientUserId, clientUserId)))
      .limit(1);
    if (!row) throw new NotFoundException(`Request ${id} not found`);
    return row;
  }

  async update(
    clientUserId: string,
    id: string,
    input: RequestUpdateInput,
  ): Promise<RequestRow> {
    const existing = await this.getForClient(clientUserId, id);
    if (existing.status !== 'open') {
      throw new BadRequestException('Only an open request can be edited');
    }

    const patch: Partial<typeof requests.$inferInsert> = { updatedAt: new Date() };
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.budgetMin !== undefined) {
      patch.budgetMin = input.budgetMin != null ? String(input.budgetMin) : null;
    }
    if (input.budgetMax !== undefined) {
      patch.budgetMax = input.budgetMax != null ? String(input.budgetMax) : null;
    }
    if (input.currency !== undefined) patch.currency = input.currency;
    if (input.deadline !== undefined) patch.deadline = input.deadline;

    const [row] = await this.dbService.db
      .update(requests)
      .set(patch)
      .where(eq(requests.id, id))
      .returning();
    if (!row) throw new NotFoundException(`Request ${id} not found`);
    return row;
  }

  async close(clientUserId: string, id: string): Promise<RequestRow> {
    await this.getForClient(clientUserId, id);
    const [row] = await this.dbService.db
      .update(requests)
      .set({ status: 'closed', acceptingOffers: false, updatedAt: new Date() })
      .where(eq(requests.id, id))
      .returning();
    if (!row) throw new NotFoundException(`Request ${id} not found`);
    return row;
  }

  // =========================================================================
  // Tailor side
  // =========================================================================

  /**
   * The tailor's board.
   *
   * Eligibility, NOT the recipient list: a tailor sees everything addressed to
   * them plus every open location request in their area, whether or not they
   * were notified and whether or not it matches their specialities. Ranking
   * puts matches first; it never hides the rest.
   */
  async listOpenForTailor(tailorId: string, query: RequestQuery): Promise<RequestRow[]> {
    const db = this.dbService.db;

    const [tailor] = await db.select().from(tailors).where(eq(tailors.id, tailorId)).limit(1);
    if (!tailor) throw new NotFoundException('Tailor not found');

    const specialties = Array.isArray(tailor.specialties) ? (tailor.specialties as string[]) : [];
    const limit = query.limit ?? 30;

    const filters = [
      eq(requests.status, 'open'),
      gte(requests.expiresAt, new Date()),
      or(
        // Addressed to me directly.
        sql`exists (select 1 from ${requestTargets}
              where ${requestTargets.requestId} = ${requests.id}
                and ${requestTargets.tailorId} = ${tailorId})`,
        // Or open to my area.
        and(
          eq(requests.visibility, 'location'),
          sql`(
            (${requests.locationScope} = 'town'
              and lower(coalesce(${requests.locationValue}, '')) = lower(coalesce(${tailor.city ?? ''}, '')))
            or (${requests.locationScope} <> 'town'
              and lower(coalesce(${requests.locationValue}, '')) = lower(coalesce(${tailor.countryCode ?? ''}, '')))
          )`,
        ),
      ),
    ];

    if (query.garmentType) filters.push(eq(requests.garmentType, query.garmentType));
    if (query.minBudget != null) {
      // A request with no budget stated is still worth showing — "no budget"
      // means "tell me", not "zero".
      filters.push(
        or(
          isNull(requests.budgetMax),
          gte(requests.budgetMax, String(query.minBudget)),
        )!,
      );
    }
    if (query.minDaysToDeadline != null) {
      const cutoff = new Date(Date.now() + query.minDaysToDeadline * 86_400_000);
      filters.push(
        or(isNull(requests.deadline), gte(requests.deadline, cutoff.toISOString().slice(0, 10)))!,
      );
    }

    // Matched-first, then newest. Specialities change the ORDER, never the set.
    const matchesMine =
      specialties.length > 0
        ? sql`case when ${requests.garmentType} = any(${sql.raw(
            `array[${specialties.map((s) => `'${s.replace(/'/g, "''")}'`).join(',')}]::text[]`,
          )}) then 0 else 1 end`
        : sql`1`;

    return db
      .select()
      .from(requests)
      .where(and(...filters))
      .orderBy(matchesMine, desc(requests.createdAt))
      .limit(limit);
  }

  /** A tailor may only open a request they are eligible for. */
  async getForTailor(tailorId: string, id: string): Promise<RequestRow> {
    const [row] = await this.dbService.db
      .select()
      .from(requests)
      .where(eq(requests.id, id))
      .limit(1);
    if (!row) throw new NotFoundException(`Request ${id} not found`);

    if (!(await this.isEligible(tailorId, row))) {
      // 404 rather than 403: whether a request exists is itself information a
      // tailor outside its audience has no claim to.
      throw new NotFoundException(`Request ${id} not found`);
    }
    return row;
  }

  async isEligible(tailorId: string, request: RequestRow): Promise<boolean> {
    if (request.visibility === 'selected') {
      const [hit] = await this.dbService.db
        .select({ tailorId: requestTargets.tailorId })
        .from(requestTargets)
        .where(
          and(eq(requestTargets.requestId, request.id), eq(requestTargets.tailorId, tailorId)),
        )
        .limit(1);
      return !!hit;
    }

    const [tailor] = await this.dbService.db
      .select()
      .from(tailors)
      .where(eq(tailors.id, tailorId))
      .limit(1);
    if (!tailor) return false;

    const value = (request.locationValue ?? '').trim().toLowerCase();
    if (!value) return false;
    return request.locationScope === 'town'
      ? (tailor.city ?? '').trim().toLowerCase() === value
      : (tailor.countryCode ?? '').trim().toLowerCase() === value;
  }

  // =========================================================================
  // Housekeeping
  // =========================================================================

  /**
   * Close requests nobody dealt with in time.
   *
   * Hourly rather than daily: the cost is one indexed UPDATE over a partial
   * index, and a request that expired at 9am should not still be collecting
   * offers at 11pm.
   *
   * Expiry is what keeps this board honest — a tailor should never spend
   * effort on a brief the client forgot about, and a client should not receive
   * an offer on something they had made elsewhere a fortnight ago.
   */
  @Cron('30 * * * *')
  async expireOverdue(): Promise<number> {
    const rows = await this.dbService.db
      .update(requests)
      .set({ status: 'expired', acceptingOffers: false, updatedAt: new Date() })
      .where(and(eq(requests.status, 'open'), lt(requests.expiresAt, new Date())))
      .returning({ id: requests.id });
    if (rows.length) this.logger.log(`Expired ${rows.length} request(s)`);
    return rows.length;
  }

  /** Signed URLs for a request's photos, for whichever side is looking. */
  async withPhotoUrls<T extends RequestRow>(row: T): Promise<T & { photoUrls: string[] }> {
    const photos = Array.isArray(row.photos) ? (row.photos as { path: string }[]) : [];
    const urls = await Promise.all(
      photos.map(async (p) => {
        const { data } = await this.supabase
          .admin()
          .storage.from(REQUESTS_BUCKET)
          .createSignedUrl(p.path, SIGNED_URL_TTL_SECONDS);
        return data?.signedUrl ?? null;
      }),
    );
    return { ...row, photoUrls: urls.filter((u): u is string => !!u) };
  }

  /** Strip the poster's identity. A tailor browsing an open board has no claim
   *  to know who posted until an offer of theirs is accepted. */
  toSummary(row: RequestRow): Omit<RequestRow, 'clientUserId'> {
    const { clientUserId: _omit, ...rest } = row;
    return rest;
  }

  async assertOfferable(requestId: string): Promise<RequestRow> {
    const [row] = await this.dbService.db
      .select()
      .from(requests)
      .where(eq(requests.id, requestId))
      .limit(1);
    if (!row) throw new NotFoundException(`Request ${requestId} not found`);
    if (row.status !== 'open') throw new BadRequestException('This request is closed');
    if (new Date(row.expiresAt) < new Date()) {
      throw new BadRequestException('This request has expired');
    }
    if (!row.acceptingOffers) {
      throw new ForbiddenException('This request already has enough offers');
    }
    return row;
  }

  /** Keep the denormalised counter and the cap in step. */
  async bumpOfferCount(requestId: string): Promise<void> {
    const [row] = await this.dbService.db
      .update(requests)
      .set({ offersCount: sql`${requests.offersCount} + 1`, updatedAt: new Date() })
      .where(eq(requests.id, requestId))
      .returning({ offersCount: requests.offersCount });

    if (row && row.offersCount >= REQUEST_LIMITS.MAX_OFFERS_PER_REQUEST) {
      await this.dbService.db
        .update(requests)
        .set({ acceptingOffers: false })
        .where(eq(requests.id, requestId));
    }
  }

  async markFulfilled(requestId: string): Promise<void> {
    await this.dbService.db
      .update(requests)
      .set({ status: 'fulfilled', acceptingOffers: false, updatedAt: new Date() })
      .where(eq(requests.id, requestId));
  }

  async countOffersToday(tailorId: string): Promise<number> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [row] = await this.dbService.db
      .select({ n: count() })
      .from(offers)
      .where(and(eq(offers.tailorId, tailorId), gte(offers.createdAt, since)));
    return Number(row?.n ?? 0);
  }
}
