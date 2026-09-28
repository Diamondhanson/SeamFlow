import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type {
  VerificationBadge,
  VerificationEvidence,
  VerificationRequest,
  VerificationState,
} from '@seamflow/schemas';
import { DbService } from '../db/db.service';
import { tailors, users, verificationRequests } from '../db/schema';
import { NotificationsService } from '../notifications/notifications.service';
import { PhoneVerificationService } from '../phone-verification/phone-verification.service';
import { SupabaseService } from '../supabase/supabase.service';

/** The private bucket evidence lives in. Never public — see the migration. */
const EVIDENCE_BUCKET = 'verification-evidence';
/**
 * How long a staff member's link to a photo lives.
 *
 * An hour is plenty to read a queue and long enough that a page left open over
 * lunch still works, while a link copied out of the dashboard stops being a
 * permanent handle on a stranger's workshop.
 */
const SIGNED_URL_TTL_S = 60 * 60;

/**
 * Verification (appendix J, phase 1).
 *
 * THE ONE RULE, IN CODE
 *
 * Nothing here blocks anyone from anything. Read that literally: this service
 * has no method that removes a capability, and nothing anywhere else asks it
 * for permission. The only refusal it makes is refusing to accept a SUBMISSION
 * that cannot be reviewed — which stops a tailor waiting two days for an answer
 * we could have given instantly, and costs them nothing else.
 *
 * WHAT THE BADGE CLAIMS
 *
 * Exactly two things (J.2): the person is reachable on a confirmed phone, and
 * the work in their feed is their own. A genuine new tailor can satisfy both on
 * day one in about five minutes. Anything that made this take longer would push
 * verification towards being a status for the established, which is the
 * opposite of the point.
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly notifications: NotificationsService,
    private readonly phone: PhoneVerificationService,
    private readonly supabase: SupabaseService,
  ) {}

  // -------------------------------------------------------------------------
  // The tailor's side
  // -------------------------------------------------------------------------

  /**
   * Everything the tailor's own screen needs, in one call.
   *
   * The preconditions come back as data rather than being inferred by the app,
   * so the screen can tick "phone confirmed" and say precisely what is missing
   * instead of letting someone fill the whole thing in and then refusing.
   */
  async state(userId: string): Promise<VerificationState> {
    const db = this.dbService.db;

    const [row] = await db
      .select({
        tailorId: tailors.id,
        isVerified: tailors.isVerified,
        verifiedAt: tailors.verifiedAt,
        phoneVerifiedAt: users.phoneVerifiedAt,
      })
      .from(users)
      .leftJoin(tailors, eq(tailors.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    const request = row?.tailorId ? await this.latestFor(row.tailorId) : null;

    return {
      request,
      isVerified: Boolean(row?.isVerified),
      verifiedAt: row?.verifiedAt?.toISOString() ?? null,
      phoneVerified: Boolean(row?.phoneVerifiedAt),
      // Requirement one is impossible without an OTP provider, so the app hides
      // the prompt rather than offering a road that ends in a wall.
      available: this.phone.isEnabled,
    };
  }

  /**
   * Ask to be verified.
   *
   * Refuses in exactly three cases, all of them things the tailor can see and
   * fix immediately — never a judgement, and never a wait:
   *   · no shop profile yet (there is nothing to verify)
   *   · phone not confirmed (requirement one of two)
   *   · a request is already pending (asking twice does not make us faster)
   */
  async submit(userId: string, evidence: VerificationEvidence[]): Promise<VerificationRequest> {
    const db = this.dbService.db;

    const [row] = await db
      .select({
        tailorId: tailors.id,
        phoneVerifiedAt: users.phoneVerifiedAt,
      })
      .from(users)
      .leftJoin(tailors, eq(tailors.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!row?.tailorId) {
      throw new BadRequestException('Set up your shop profile before asking to be verified.');
    }
    if (!row.phoneVerifiedAt) {
      throw new BadRequestException('Confirm your phone number first.');
    }

    // Phase 1 asks for one photo of their work. Stated here rather than in the
    // schema so that raising the bar later is not a breaking client change.
    const photos = evidence.filter((e) => e.kind === 'work_photo');
    if (photos.length === 0) {
      throw new BadRequestException('Add a photo of a piece you made.');
    }

    // Every storage path must sit under this user's own prefix. A path is
    // client-supplied, so without this check a tailor could point their request
    // at somebody else's evidence and be verified on it.
    for (const photo of photos) {
      const prefix = photo.storagePath.split('/')[0];
      if (prefix !== userId) {
        throw new BadRequestException('That photo does not belong to this account.');
      }
    }

    try {
      const [created] = await db
        .insert(verificationRequests)
        .values({ tailorId: row.tailorId, evidence, status: 'pending' })
        .returning();
      return this.toRequest(created!);
    } catch (err) {
      // The partial unique index is what enforces one-in-flight, so a race
      // between two taps lands here rather than creating a second request.
      if (String(err).includes('verification_requests_one_pending')) {
        throw new ConflictException('You already have a request waiting on us.');
      }
      throw err;
    }
  }

  /**
   * Take it back before we have looked.
   *
   * `withdrawn` rather than a delete: the tailor gets a clean slate and can
   * submit again, while the queue keeps an honest record of what happened. It
   * is deliberately NOT `rejected` — nobody decided anything against them.
   */
  async withdraw(userId: string): Promise<VerificationRequest> {
    const db = this.dbService.db;

    const [row] = await db
      .select({ tailorId: tailors.id })
      .from(tailors)
      .where(eq(tailors.userId, userId))
      .limit(1);
    if (!row) throw new NotFoundException('No shop profile.');

    const [updated] = await db
      .update(verificationRequests)
      .set({ status: 'withdrawn', updatedAt: new Date() })
      .where(
        and(
          eq(verificationRequests.tailorId, row.tailorId),
          eq(verificationRequests.status, 'pending'),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('Nothing waiting to be withdrawn.');
    return this.toRequest(updated);
  }

  // -------------------------------------------------------------------------
  // The staff side
  // -------------------------------------------------------------------------

  /** The queue: longest wait first, because that is who is owed an answer. */
  async queue(status: 'pending' | 'approved' | 'rejected' | 'withdrawn' = 'pending') {
    const db = this.dbService.db;
    const rows = await db
      .select({
        request: verificationRequests,
        tailorId: tailors.id,
        businessName: tailors.businessName,
        userId: tailors.userId,
        isVerified: tailors.isVerified,
        city: tailors.city,
        countryCode: tailors.countryCode,
        joinedAt: tailors.createdAt,
        phone: users.phone,
        phoneVerifiedAt: users.phoneVerifiedAt,
      })
      .from(verificationRequests)
      .innerJoin(tailors, eq(tailors.id, verificationRequests.tailorId))
      .innerJoin(users, eq(users.id, tailors.userId))
      .where(eq(verificationRequests.status, status))
      .orderBy(
        status === 'pending'
          ? asc(verificationRequests.submittedAt)
          : desc(verificationRequests.decidedAt),
      )
      .limit(200);

    // Sign every photo in the page in ONE storage call rather than per row.
    const paths = rows.flatMap((r) =>
      ((r.request.evidence ?? []) as VerificationEvidence[])
        .filter((e) => e.kind === 'work_photo')
        .map((e) => e.storagePath),
    );
    const signed = await this.signEvidence(paths);

    return rows.map((r) => ({
      ...this.toRequest(r.request),
      // The same evidence, with a URL staff can actually open. Absent for a
      // request whose photos are past retention, which is why the row also
      // carries `evidencePurged` — "no photo" and "photo we deleted on purpose"
      // must not look the same to whoever is reading.
      evidenceUrls: ((r.request.evidence ?? []) as VerificationEvidence[])
        .filter((e) => e.kind === 'work_photo')
        .map((e) => ({ storagePath: e.storagePath, url: signed.get(e.storagePath) ?? null })),
      tailor: {
        id: r.tailorId,
        userId: r.userId,
        businessName: r.businessName,
        isVerified: r.isVerified,
        city: r.city,
        countryCode: r.countryCode,
        joinedAt: r.joinedAt?.toISOString() ?? null,
        phone: r.phone,
        phoneVerified: Boolean(r.phoneVerifiedAt),
      },
    }));
  }

  /** How many are waiting, for the nav badge. */
  async pendingCount(): Promise<number> {
    const [row] = await this.dbService.db
      .select({ count: sql<number>`count(*)::int` })
      .from(verificationRequests)
      .where(eq(verificationRequests.status, 'pending'));
    return row?.count ?? 0;
  }

  /**
   * Approve or decline.
   *
   * A decline REQUIRES a note, and that note is shown to the tailor word for
   * word — so the API refuses an empty one rather than letting staff send
   * somebody away with no way to understand or fix it.
   */
  async decide(
    staffUserId: string,
    requestId: string,
    approve: boolean,
    note: string | null,
  ): Promise<VerificationRequest> {
    const db = this.dbService.db;
    const trimmed = note?.trim() || null;

    if (!approve && !trimmed) {
      throw new BadRequestException('A decline needs a reason. The tailor is shown it verbatim.');
    }

    const [existing] = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.id, requestId))
      .limit(1);
    if (!existing) throw new NotFoundException('No such request.');
    if (existing.status !== 'pending') {
      throw new ConflictException(`That request was already ${existing.status}.`);
    }

    const now = new Date();
    const [updated] = await db
      .update(verificationRequests)
      .set({
        status: approve ? 'approved' : 'rejected',
        decidedAt: now,
        decidedBy: staffUserId,
        decisionNote: trimmed,
        updatedAt: now,
      })
      .where(eq(verificationRequests.id, requestId))
      .returning();

    // The badge and its provenance move together. `verifiedAt` is what tells a
    // later reader this one was granted on evidence rather than by the old
    // criteria-free button.
    if (approve) {
      await db
        .update(tailors)
        .set({ isVerified: true, verifiedAt: now, verifiedNote: trimmed, updatedAt: now })
        .where(eq(tailors.id, existing.tailorId));
    }

    await this.notifyDecision(existing.tailorId, requestId, approve, trimmed);
    return this.toRequest(updated!);
  }

  /**
   * Take the badge back.
   *
   * Clears the provenance too. Leaving `verifiedAt` set on an unverified shop
   * would make the popover claim SeamFlow checked something it no longer
   * stands behind.
   */
  async revoke(tailorId: string): Promise<void> {
    await this.dbService.db
      .update(tailors)
      .set({ isVerified: false, verifiedAt: null, verifiedNote: null, updatedAt: new Date() })
      .where(eq(tailors.id, tailorId));
  }

  // -------------------------------------------------------------------------
  // What a client sees (J.5)
  // -------------------------------------------------------------------------

  /**
   * The badge popover's contents, for one tailor.
   *
   * "A tick nobody can interrogate is decoration", so this returns the sentence
   * behind the tick. It contains nothing private — no phone number, no
   * coordinate, no evidence — because it is served to anyone who can see the
   * shop.
   */
  async badge(tailorId: string): Promise<VerificationBadge> {
    const [row] = await this.dbService.db
      .select({
        isVerified: tailors.isVerified,
        verifiedAt: tailors.verifiedAt,
        joinedAt: tailors.createdAt,
        phoneVerifiedAt: users.phoneVerifiedAt,
        completedOrders: tailors.completedOrders,
        responseTimeHours: tailors.responseTimeHours,
      })
      .from(tailors)
      .innerJoin(users, eq(users.id, tailors.userId))
      .where(eq(tailors.id, tailorId))
      .limit(1);

    if (!row) throw new NotFoundException('No such shop.');

    return {
      isVerified: Boolean(row.isVerified),
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
      // Whether they are reachable, never the number itself.
      phoneConfirmed: Boolean(row.phoneVerifiedAt),
      memberSince: row.joinedAt?.toISOString() ?? null,
      // Phase 2's signals ride along so the popover is a single call. They are
      // shown beside the badge, never counted towards earning it.
      completedOrders: row.completedOrders,
      responseTimeHours: row.responseTimeHours ?? null,
    };
  }

  // -------------------------------------------------------------------------

  /** One storage round trip for a whole page of evidence. */
  private async signEvidence(paths: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    if (!paths.length) return out;
    const { data, error } = await this.supabase
      .admin()
      .storage.from(EVIDENCE_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_S);
    if (error) this.logger.warn(`Could not sign verification evidence: ${error.message}`);
    for (const e of data ?? []) if (e.signedUrl && e.path) out.set(e.path, e.signedUrl);
    return out;
  }

  private async latestFor(tailorId: string): Promise<VerificationRequest | null> {
    const [row] = await this.dbService.db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.tailorId, tailorId))
      .orderBy(desc(verificationRequests.submittedAt))
      .limit(1);
    return row ? this.toRequest(row) : null;
  }

  private async notifyDecision(
    tailorId: string,
    requestId: string,
    approve: boolean,
    note: string | null,
  ): Promise<void> {
    const [row] = await this.dbService.db
      .select({ userId: tailors.userId })
      .from(tailors)
      .where(eq(tailors.id, tailorId))
      .limit(1);
    if (!row) return;

    // Inbox-only: the push copy would have to be rendered in the reader's
    // language here, and the screen they need to open says far more than a
    // notification tray ever could. The inbox row stores type + params and is
    // rendered in-app, so it follows the reader's language.
    await this.notifications.emit(row.userId, {
      type: approve ? 'verification.approved' : 'verification.rejected',
      entity: { type: 'verification_request', id: requestId },
      params: note ? { reason: note } : {},
    });
  }

  private toRequest(row: typeof verificationRequests.$inferSelect): VerificationRequest {
    return {
      id: row.id,
      tailorId: row.tailorId,
      status: row.status,
      evidence: (row.evidence ?? []) as VerificationEvidence[],
      submittedAt: row.submittedAt.toISOString(),
      decidedAt: row.decidedAt?.toISOString() ?? null,
      decisionNote: row.decisionNote,
      evidencePurged: Boolean(row.evidencePurgedAt),
    };
  }
}
