import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gt, inArray, sql, type SQL } from 'drizzle-orm';
import type {
  Conversation,
  ConversationCreateInput,
  ConversationList,
  ConversationQuoteInput,
  ConversationQuoteResult,
  Message,
  MessageAttachment,
  MessageCreateInput,
  MessagePage,
  MessageReaction,
  MessageReplyPreview,
  SaveChatMeasurementInput,
  SaveChatMeasurementResult,
} from '@seamflow/schemas';
import { DbService } from '../db/db.service';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersService } from '../orders/orders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { ClientsService } from '../clients/clients.service';
import { MeasurementSetsService } from '../measurement-sets/measurement-sets.service';
import {
  clients,
  conversations,
  feedPosts,
  invoices,
  messages,
  orderClaims,
  orders,
  tailors,
  users,
} from '../db/schema';

const CHAT_BUCKET = 'chat-media';
const FEED_BUCKET = 'feed';
const AVATARS_BUCKET = 'avatars';
const SIGNED_URL_TTL_S = 60 * 60;
/** Re-send anything stamped this close to the last sync (see listMessages). */
const DELTA_OVERLAP_MS = 10_000;
/** A delta bigger than this is cheaper to replace with a fresh first page. */
const DELTA_MAX = 500;

/** Who the caller is, resolved once per request from their user id. */
export interface ChatActor {
  userId: string;
  /** Set when this user owns a tailor account. */
  tailorId: string | null;
}

type ConversationRow = typeof conversations.$inferSelect;
type MessageRow = typeof messages.$inferSelect;

/**
 * In-app chat (ROADMAP D.2.3).
 *
 * Three things here are deliberate and worth not "simplifying" later:
 *
 *  1. **Role-relative responses.** Every read resolves the caller's side and
 *     returns the OTHER party as `counterparty`, plus the caller's own unread
 *     count. Both apps then render one component with no role branching.
 *
 *  2. **Idempotent sends.** `clientId` is minted on the device. A send that
 *     times out can be retried with the same id and the unique index makes the
 *     second insert a no-op — we detect it and return the original row. This is
 *     what makes the offline queue safe to flush blindly.
 *
 *  3. **Denormalised counters.** `last_message_at`, `last_message_preview` and
 *     the two unread columns are maintained on write so the conversation list
 *     is a single query. Computing unread per row at read time is the classic
 *     N+1 that makes a chat list feel slow once someone has 30 threads.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly orders: OrdersService,
    private readonly invoices: InvoicesService,
    private readonly clients: ClientsService,
    private readonly measurementSets: MeasurementSetsService,
  ) {}

  // ── Actor + access ────────────────────────────────────────────────────────

  async resolveActor(userId: string): Promise<ChatActor> {
    const rows = await this.dbService.db
      .select({ id: tailors.id })
      .from(tailors)
      .where(eq(tailors.userId, userId))
      .limit(1);
    return { userId, tailorId: rows[0]?.id ?? null };
  }

  /** Which side of this thread is the caller on? Throws if neither. */
  private sideOf(convo: ConversationRow, actor: ChatActor): 'client' | 'tailor' {
    if (actor.tailorId && convo.tailorId === actor.tailorId) return 'tailor';
    if (convo.clientUserId === actor.userId) return 'client';
    throw new ForbiddenException('Not a participant in this conversation');
  }

  private async loadConversation(id: string): Promise<ConversationRow> {
    const rows = await this.dbService.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);
    const convo = rows[0];
    if (!convo) throw new NotFoundException(`Conversation ${id} not found`);
    return convo;
  }

  // ── URL helpers ───────────────────────────────────────────────────────────

  private publicUrl(bucket: string, path: string): string {
    return this.supabase.admin().storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  /**
   * Chat images live in a PRIVATE bucket — only the two participants may read
   * them — so they need short-lived signed URLs, unlike feed images.
   */
  private async signChatPaths(paths: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    if (paths.length === 0) return out;
    const { data, error } = await this.supabase
      .admin()
      .storage.from(CHAT_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_S);
    if (error || !data) {
      this.logger.warn(`Could not sign chat attachments: ${error?.message}`);
      return out;
    }
    for (const entry of data) {
      if (entry.signedUrl && entry.path) out.set(entry.path, entry.signedUrl);
    }
    return out;
  }

  /** Resolve every attachment URL for a page of messages in ONE storage call. */
  private async hydrateAttachments(rows: MessageRow[]): Promise<Map<string, MessageAttachment[]>> {
    const db = this.dbService.db;
    const imagePaths: string[] = [];
    const designIds = new Set<string>();
    const orderIds = new Set<string>();
    for (const r of rows) {
      for (const a of (r.attachments as MessageAttachment[]) ?? []) {
        if (a.kind === 'image') {
          imagePaths.push(a.storagePath);
          if (a.thumbnailPath) imagePaths.push(a.thumbnailPath);
        } else if (a.kind === 'design') {
          designIds.add(a.designPostId);
        } else if (a.kind === 'order') {
          orderIds.add(a.orderId);
        }
      }
    }
    const signed = await this.signChatPaths([...new Set(imagePaths)]);

    // Design attachments → public feed thumbnail URL.
    const designThumb = new Map<string, string>();
    if (designIds.size > 0) {
      const posts = await db
        .select({ id: feedPosts.id, thumb: feedPosts.publicThumbPath })
        .from(feedPosts)
        .where(inArray(feedPosts.id, [...designIds]));
      for (const p of posts) designThumb.set(p.id, this.publicUrl(FEED_BUCKET, p.thumb));
    }

    // Order attachments → a small summary so the card renders without a refetch.
    const orderSummary = new Map<
      string,
      { orderName: string; status: string; dateDelivery: string | null }
    >();
    if (orderIds.size > 0) {
      const rowsO = await db
        .select({
          id: orders.id,
          orderName: orders.orderName,
          status: orders.status,
          dateDelivery: orders.dateDelivery,
        })
        .from(orders)
        .where(inArray(orders.id, [...orderIds]));
      for (const o of rowsO) {
        orderSummary.set(o.id, {
          orderName: o.orderName,
          status: o.status,
          dateDelivery: o.dateDelivery ? o.dateDelivery.toISOString() : null,
        });
      }
    }

    const byMessage = new Map<string, MessageAttachment[]>();
    for (const r of rows) {
      const hydrated = ((r.attachments as MessageAttachment[]) ?? []).map((a) => {
        if (a.kind === 'image') {
          return {
            ...a,
            url: signed.get(a.storagePath),
            thumbnailUrl: a.thumbnailPath ? signed.get(a.thumbnailPath) : undefined,
          };
        }
        if (a.kind === 'design') {
          const url = designThumb.get(a.designPostId);
          return { ...a, imageUrl: a.imageUrl ?? url, thumbnailUrl: a.thumbnailUrl ?? url };
        }
        if (a.kind === 'order') {
          const s = orderSummary.get(a.orderId);
          return s ? { ...a, orderName: s.orderName, status: s.status, dateDelivery: s.dateDelivery } : a;
        }
        return a;
      });
      byMessage.set(r.id, hydrated);
    }
    return byMessage;
  }

  /** Batch-resolve a compact quote of each replied-to message. */
  private async hydrateReplyPreviews(
    rows: MessageRow[],
  ): Promise<Map<string, MessageReplyPreview>> {
    const map = new Map<string, MessageReplyPreview>();
    const parentIds = [...new Set(rows.map((r) => r.replyToId).filter(Boolean) as string[])];
    if (parentIds.length === 0) return map;
    const parents = await this.dbService.db
      .select()
      .from(messages)
      .where(inArray(messages.id, parentIds));
    for (const p of parents) {
      map.set(p.id, { messageId: p.id, side: p.senderType, snippet: this.previewSnippet(p) });
    }
    return map;
  }

  /** Language-neutral one-line preview of a message (body text, else a marker). */
  private previewSnippet(row: MessageRow): string {
    if (row.body?.trim()) return row.body.trim().slice(0, 120);
    const atts = (row.attachments as MessageAttachment[]) ?? [];
    if (atts.some((a) => a.kind === 'image')) return '📷';
    if (atts.some((a) => a.kind === 'order')) return '📦';
    if (atts.some((a) => a.kind === 'measurement')) return '📏';
    if (atts.some((a) => a.kind === 'design')) return '🖼️';
    if (atts.some((a) => a.kind === 'link')) return '🔗';
    return '';
  }

  /** Hydrate + project a batch of message rows into API `Message`s. */
  private async projectMessages(rows: MessageRow[]): Promise<Message[]> {
    const [attachments, replies] = await Promise.all([
      this.hydrateAttachments(rows),
      this.hydrateReplyPreviews(rows),
    ]);
    return rows.map((r) =>
      this.toMessage(
        r,
        attachments.get(r.id) ?? [],
        r.replyToId ? (replies.get(r.replyToId) ?? null) : null,
      ),
    );
  }

  private toMessage(
    row: MessageRow,
    attachments: MessageAttachment[],
    replyPreview: MessageReplyPreview | null = null,
  ): Message {
    return {
      id: row.id,
      conversationId: row.conversationId,
      senderType: row.senderType,
      senderUserId: row.senderUserId,
      body: row.body ?? null,
      attachments,
      reactions: ((row.reactions as MessageReaction[]) ?? []),
      replyToId: row.replyToId ?? null,
      replyPreview,
      clientId: row.clientId ?? null,
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt ? row.readAt.toISOString() : null,
    };
  }

  // ── Conversation projection ───────────────────────────────────────────────

  private async toConversation(
    convo: ConversationRow,
    side: 'client' | 'tailor',
  ): Promise<Conversation> {
    const db = this.dbService.db;

    // The counterparty is whoever the caller is not.
    let counterparty: Conversation['counterparty'];
    if (side === 'client') {
      const rows = await db.select().from(tailors).where(eq(tailors.id, convo.tailorId)).limit(1);
      const t = rows[0];
      counterparty = {
        id: convo.tailorId,
        name: t?.businessName ?? 'Tailor',
        avatarUrl: t?.avatarPath ? this.publicUrl(AVATARS_BUCKET, t.avatarPath) : (t?.photoUrl ?? null),
        isVerified: t?.isVerified ?? false,
      };
    } else {
      const rows = await db.select().from(users).where(eq(users.id, convo.clientUserId)).limit(1);
      const u = rows[0];
      counterparty = {
        id: convo.clientUserId,
        // NEVER fall back to phone or email here. This string is rendered in the
        // tailor's conversation list, and public.users.full_name defaults to ''
        // — so falling through to a contact field silently disclosed the
        // client's email address to the tailor for every email/password signup
        // (Google supplies full_name, so this only ever bit one signup path).
        // The client app now requires a name at sign-up; '' can still reach us
        // from accounts created before that, hence the generic fallback.
        name: u?.fullName?.trim() || 'Client',
        avatarUrl: null,
      };
    }

    let design: Conversation['design'] = null;
    if (convo.designPostId) {
      const rows = await db
        .select()
        .from(feedPosts)
        .where(eq(feedPosts.id, convo.designPostId))
        .limit(1);
      const p = rows[0];
      if (p) {
        design = {
          id: p.id,
          thumbnailUrl: this.publicUrl(FEED_BUCKET, p.publicThumbPath),
          title: p.title ?? null,
          caption: p.caption ?? null,
          garmentType: p.garmentType ?? null,
          startingPrice: p.startingPrice ?? null,
          currency: p.currency ?? null,
        };
      }
    }

    // The tailor's own record for this person, when they have said who it is.
    // Never resolved for the client side: it is the tailor's book, and the
    // name in it may not be the one the customer uses.
    let linkedClient: Conversation['linkedClient'] = null;
    if (side === 'tailor' && convo.clientId) {
      const rows = await db
        .select({ id: clients.id, fullName: clients.fullName })
        .from(clients)
        .where(eq(clients.id, convo.clientId))
        .limit(1);
      linkedClient = rows[0] ?? null;
    }

    return {
      id: convo.id,
      origin: convo.origin,
      counterparty,
      design,
      orderId: convo.orderId ?? null,
      linkedClient,
      lastMessageAt: convo.lastMessageAt.toISOString(),
      lastMessagePreview: convo.lastMessagePreview ?? null,
      unreadCount: side === 'client' ? convo.clientUnread : convo.tailorUnread,
      createdAt: convo.createdAt.toISOString(),
    };
  }

  // ── Cursors ───────────────────────────────────────────────────────────────

  private encodeCursor(at: Date, id: string): string {
    return Buffer.from(`${at.toISOString()}|${id}`).toString('base64url');
  }

  private decodeCursor(cursor?: string): { at: Date; id: string } | null {
    if (!cursor) return null;
    try {
      const [iso, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
      if (!iso || !id) return null;
      const at = new Date(iso);
      return Number.isNaN(at.getTime()) ? null : { at, id };
    } catch {
      return null;
    }
  }

  // ── Create (the "Inquire" action) ─────────────────────────────────────────

  async createConversation(
    actor: ChatActor,
    input: ConversationCreateInput,
  ): Promise<Conversation> {
    const db = this.dbService.db;

    const tailorRows = await db
      .select()
      .from(tailors)
      .where(eq(tailors.id, input.tailorId))
      .limit(1);
    if (!tailorRows[0]) throw new NotFoundException(`Tailor ${input.tailorId} not found`);

    // A tailor inquiring with themselves would create a thread that can never
    // be answered — and would corrupt the unread counters.
    if (actor.tailorId && actor.tailorId === input.tailorId) {
      throw new ForbiddenException('You cannot start a conversation with yourself');
    }

    const designPostId = input.designPostId ?? null;

    // Reuse rather than duplicate. The partial unique indexes enforce this at
    // the database level too; this just avoids the round-trip through an error.
    const existing = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.clientUserId, actor.userId),
          eq(conversations.tailorId, input.tailorId),
          designPostId
            ? eq(conversations.designPostId, designPostId)
            : sql`${conversations.designPostId} is null`,
        ),
      )
      .limit(1);

    let convo = existing[0];
    const isNewThread = !convo;
    if (!convo) {
      const inserted = await db
        .insert(conversations)
        .values({
          clientUserId: actor.userId,
          tailorId: input.tailorId,
          origin: 'inquiry',
          designPostId,
        })
        .returning();
      convo = inserted[0]!;
    }

    await this.postMessage(convo, actor, 'client', {
      body: input.firstMessage,
      clientId: input.clientId,
      // Attach the design to the OPENING message on a new thread, so the tailor
      // leads with the actual piece being asked about (a picture is far more
      // recognisable than a name). Reuses (re-inquiries) don't re-attach.
      attachments: isNewThread && designPostId ? [{ kind: 'design', designPostId }] : undefined,
    });

    // A NEW enquiry is an event worth keeping; the messages inside it are not.
    // postMessage already pushed "you have a message" — this adds the durable
    // inbox row, and only for a genuinely new thread, so re-inquiring about the
    // same design doesn't stack duplicates. persist-only (no second push) so
    // the tailor's phone buzzes once, not twice.
    if (isNewThread) void this.recordEnquiry(convo);

    const fresh = await this.loadConversation(convo.id);
    return this.toConversation(fresh, 'client');
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  async listConversations(
    actor: ChatActor,
    params: { cursor?: string; limit?: number },
  ): Promise<ConversationList> {
    const db = this.dbService.db;
    const limit = Math.min(Math.max(params.limit ?? 30, 1), 50);

    const mine: SQL | undefined = actor.tailorId
      ? sql`(${conversations.tailorId} = ${actor.tailorId}::uuid or ${conversations.clientUserId} = ${actor.userId}::uuid)`
      : eq(conversations.clientUserId, actor.userId);

    const conditions: SQL[] = mine ? [mine] : [];
    const cur = this.decodeCursor(params.cursor);
    if (cur) {
      conditions.push(
        sql`(${conversations.lastMessageAt}, ${conversations.id}) < (${cur.at.toISOString()}::timestamptz, ${cur.id}::uuid)`,
      );
    }

    const rows = await db
      .select()
      .from(conversations)
      .where(and(...conditions))
      .orderBy(desc(conversations.lastMessageAt), desc(conversations.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const items = await Promise.all(
      page.map((c) => this.toConversation(c, this.sideOf(c, actor))),
    );

    // One aggregate for the tab badge rather than summing a paginated page.
    const totals = await db
      .select({
        total: sql<number>`coalesce(sum(case
          when ${conversations.tailorId} = ${actor.tailorId ?? null}::uuid then ${conversations.tailorUnread}
          else ${conversations.clientUnread} end), 0)`,
      })
      .from(conversations)
      .where(and(...(mine ? [mine] : [])));

    const last = page[page.length - 1];
    return {
      items,
      nextCursor: hasMore && last ? this.encodeCursor(last.lastMessageAt, last.id) : null,
      totalUnread: Number(totals[0]?.total ?? 0),
    };
  }

  async getConversation(
    actor: ChatActor,
    id: string,
    limit = 30,
  ): Promise<{ conversation: Conversation; messages: MessagePage }> {
    const convo = await this.loadConversation(id);
    const side = this.sideOf(convo, actor);
    const [conversation, page] = await Promise.all([
      this.toConversation(convo, side),
      this.listMessages(actor, id, { limit }),
    ]);
    return { conversation, messages: page };
  }

  async listMessages(
    actor: ChatActor,
    conversationId: string,
    params: { cursor?: string; limit?: number; since?: string },
  ): Promise<MessagePage> {
    const convo = await this.loadConversation(conversationId);
    this.sideOf(convo, actor); // access check
    const db = this.dbService.db;

    // Taken BEFORE reading, so anything committed while we read is caught by
    // the next sync rather than falling between two watermarks.
    const [{ now }] = (await db.execute(sql`select now() as now`)) as unknown as [{ now: Date | string }];
    const syncedAt = new Date(now).toISOString();

    // ── Delta: everything created or changed since the device last synced ──
    if (params.since) {
      const since = new Date(params.since);
      if (Number.isNaN(since.getTime())) throw new BadRequestException('Invalid since');
      // A little overlap covers a write that committed just after the last
      // sync read but was stamped just before it. Merging is by id, so a
      // message seen twice is harmless; one never seen is not.
      const from = new Date(since.getTime() - DELTA_OVERLAP_MS);
      const rows = await db
        .select()
        .from(messages)
        .where(and(eq(messages.conversationId, conversationId), gt(messages.updatedAt, from)))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(DELTA_MAX + 1);
      if (rows.length > DELTA_MAX) {
        return { items: [], nextCursor: null, syncedAt, reset: true };
      }
      return { items: await this.projectMessages(rows), nextCursor: null, syncedAt };
    }

    // ── Pages, newest first, walking back by cursor ──
    const limit = Math.min(Math.max(params.limit ?? 30, 1), 100);
    const conditions: SQL[] = [eq(messages.conversationId, conversationId)];
    const cur = this.decodeCursor(params.cursor);
    if (cur) {
      conditions.push(
        sql`(${messages.createdAt}, ${messages.id}) < (${cur.at.toISOString()}::timestamptz, ${cur.id}::uuid)`,
      );
    }

    const rows = await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    return {
      items: await this.projectMessages(page),
      nextCursor: hasMore && last ? this.encodeCursor(last.createdAt, last.id) : null,
      // Only the newest page is a valid starting point for deltas.
      ...(cur ? {} : { syncedAt }),
    };
  }

  /**
   * Re-project specific messages. The device keeps messages for a long time,
   * but image links are signed for an hour; this refreshes them (and order
   * card thumbnails) without re-downloading the whole thread.
   */
  async hydrateMessages(actor: ChatActor, conversationId: string, ids: string[]): Promise<Message[]> {
    const convo = await this.loadConversation(conversationId);
    this.sideOf(convo, actor);
    const rows = await this.dbService.db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), inArray(messages.id, ids)));
    return this.projectMessages(rows);
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  async sendMessage(
    actor: ChatActor,
    conversationId: string,
    input: MessageCreateInput,
  ): Promise<Message> {
    const convo = await this.loadConversation(conversationId);
    const side = this.sideOf(convo, actor);
    return this.postMessage(convo, actor, side, input);
  }

  /**
   * The single write path for a message — used by both `sendMessage` and the
   * first message of a new inquiry, so counters and push can't drift apart.
   */
  private async postMessage(
    convo: ConversationRow,
    actor: ChatActor,
    side: 'client' | 'tailor',
    input: MessageCreateInput,
  ): Promise<Message> {
    const db = this.dbService.db;
    const attachments = (input.attachments ?? []) as MessageAttachment[];

    // Idempotency: a retried send with the same clientId must not double-post.
    if (input.clientId) {
      const dup = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, convo.id),
            eq(messages.clientId, input.clientId),
          ),
        )
        .limit(1);
      if (dup[0]) {
        return (await this.projectMessages([dup[0]]))[0]!;
      }
    }

    const inserted = await db
      .insert(messages)
      .values({
        conversationId: convo.id,
        senderType: side,
        senderUserId: actor.userId,
        body: input.body ?? null,
        attachments,
        replyToId: input.replyToId ?? null,
        clientId: input.clientId ?? null,
      })
      .returning();
    const row = inserted[0]!;

    // Preview text for the list — attachments-only messages still need a label.
    const preview =
      input.body?.trim() ||
      (attachments.some((a) => a.kind === 'image')
        ? '📷'
        : attachments.length > 0
          ? '🧵'
          : '');

    await db
      .update(conversations)
      .set({
        lastMessageAt: row.createdAt,
        lastMessagePreview: preview.slice(0, 140),
        // Only the RECIPIENT's counter moves.
        ...(side === 'client'
          ? { tailorUnread: sql`${conversations.tailorUnread} + 1` }
          : { clientUnread: sql`${conversations.clientUnread} + 1` }),
      })
      .where(eq(conversations.id, convo.id));

    void this.notifyRecipient(convo, side, preview);

    return (await this.projectMessages([row]))[0]!;
  }

  /**
   * Record a new enquiry in the tailor's inbox.
   *
   * Inbox-only: `postMessage` has already pushed the message itself, and two
   * buzzes for one event is exactly the noise that gets an app muted.
   */
  private async recordEnquiry(convo: ConversationRow): Promise<void> {
    try {
      const db = this.dbService.db;
      const [t] = await db
        .select({ userId: tailors.userId })
        .from(tailors)
        .where(eq(tailors.id, convo.tailorId))
        .limit(1);
      if (!t) return;

      const [client] = await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, convo.clientUserId))
        .limit(1);

      await this.notifications.emit(t.userId, {
        type: 'enquiry.received',
        // Snapshot the name so the row still reads correctly if the account
        // is later deleted — entityId below is what navigation uses.
        params: { clientName: client?.fullName?.trim() || 'Client' },
        entity: { type: 'conversation', id: convo.id },
        push: null,
        persist: true,
      });
    } catch (err) {
      this.logger.warn(`Enquiry inbox record failed for ${convo.id}: ${String(err)}`);
    }
  }

  /**
   * Push to whoever didn't send. Fire-and-forget: a failed push must never
   * fail the send — the message is already durably stored, and Realtime will
   * deliver it if the recipient has the thread open.
   */
  private async notifyRecipient(
    convo: ConversationRow,
    senderSide: 'client' | 'tailor',
    preview: string,
  ): Promise<void> {
    try {
      const db = this.dbService.db;
      let recipientUserId: string;
      let title: string;

      if (senderSide === 'client') {
        const rows = await db
          .select({ userId: tailors.userId })
          .from(tailors)
          .where(eq(tailors.id, convo.tailorId))
          .limit(1);
        if (!rows[0]) return;
        recipientUserId = rows[0].userId;
        const client = await db
          .select({ fullName: users.fullName })
          .from(users)
          .where(eq(users.id, convo.clientUserId))
          .limit(1);
        title = client[0]?.fullName?.trim() || 'New enquiry';
      } else {
        recipientUserId = convo.clientUserId;
        const t = await db
          .select({ businessName: tailors.businessName })
          .from(tailors)
          .where(eq(tailors.id, convo.tailorId))
          .limit(1);
        title = t[0]?.businessName ?? 'Your tailor';
      }

      await this.notifications.sendToUser(recipientUserId, {
        title,
        body: preview || 'New message',
        data: {
          type: 'chat.message',
          conversationId: convo.id,
          // entityType/entityId are what the apps' tap handlers route on. The
          // old payload carried only `conversationId`, which both handlers
          // ignored (they looked for `orderId`), so tapping a chat notification
          // silently did nothing.
          entityType: 'conversation',
          entityId: convo.id,
          // Which side of this thread the RECIPIENT is on. A single account can
          // be the tailor in one conversation and the customer in another, so
          // the app routes the tap into this side's tree (tailor vs client) and
          // switches mode to match — not into whichever interface is open.
          recipientSide: senderSide === 'client' ? 'tailor' : 'client',
        },
      });
    } catch (err) {
      this.logger.warn(`Chat push failed for conversation ${convo.id}: ${String(err)}`);
    }
  }

  // ── Read receipts ─────────────────────────────────────────────────────────

  async markRead(actor: ChatActor, conversationId: string): Promise<{ unreadCount: number }> {
    const convo = await this.loadConversation(conversationId);
    const side = this.sideOf(convo, actor);
    const db = this.dbService.db;

    // Stamp read_at on the other party's unread messages. Realtime carries the
    // update to the sender, which is what turns their tick blue.
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          sql`${messages.senderType} <> ${side}`,
          sql`${messages.readAt} is null`,
        ),
      );

    await db
      .update(conversations)
      .set(side === 'client' ? { clientUnread: 0 } : { tailorUnread: 0 })
      .where(eq(conversations.id, conversationId));

    return { unreadCount: 0 };
  }

  // ── Development only ──────────────────────────────────────────────────────

  /**
   * Seed a fake inbound enquiry so the chat can be exercised end to end before
   * the client app exists — there is otherwise no way for a conversation to
   * come into being, and an inbox that can never fill is untestable.
   *
   * Refuses outright in production. It creates a synthetic consumer account,
   * and a real one arriving through the front door must never collide with it.
   */
  async simulateEnquiry(actor: ChatActor): Promise<Conversation> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Simulated enquiries are disabled in production');
    }
    if (!actor.tailorId) {
      throw new ForbiddenException('Only a tailor can simulate an enquiry');
    }
    const db = this.dbService.db;

    // One reusable synthetic consumer per tailor, so repeated simulations land
    // in the same thread instead of littering the inbox.
    const fakeEmail = `sim-client+${actor.tailorId}@seamflow.local`;
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, fakeEmail))
      .limit(1);

    let clientUserId = existingUser[0]?.id;
    if (!clientUserId) {
      const created = await db
        .insert(users)
        .values({
          id: crypto.randomUUID(),
          email: fakeEmail,
          fullName: 'Simulated client',
          role: 'client',
        })
        .returning();
      clientUserId = created[0]!.id;
    }

    const fakeActor: ChatActor = { userId: clientUserId, tailorId: null };
    return this.createConversation(fakeActor, {
      tailorId: actor.tailorId,
      firstMessage:
        'Hi! I saw your work and I love it. Could you make something similar for me?',
    });
  }

  // ── Who is this, in the tailor's own book? ────────────────────────────────

  /**
   * Resolve the thread's customer to one of the tailor's `clients` rows, and
   * remember the answer on the conversation.
   *
   * This is the join that was missing. A conversation's counterparty is an
   * account; orders and measurement sets belong to the tailor's client book.
   * Every action that moves something out of a thread and into the business
   * has to cross that gap, and asking "which client is this?" each time is the
   * difference between a feature that works and one nobody uses.
   *
   * Order of preference:
   *   1. An explicit `clientId` — the tailor just picked, and picking again
   *      re-points the thread (people do get filed under the wrong name).
   *   2. The link already stored on the conversation.
   *   3. A match on phone number, so a tailor who already knows this person
   *      does not end up with a duplicate.
   *   4. A new record, created from what the enquiry tells us.
   */
  private async resolveClient(
    tailorId: string,
    convo: ConversationRow,
    input: { clientId?: string; clientName?: string; clientPhone?: string | null },
  ): Promise<{ id: string; fullName: string }> {
    const db = this.dbService.db;

    const load = async (id: string): Promise<{ id: string; fullName: string } | null> => {
      const rows = await db
        .select({ id: clients.id, fullName: clients.fullName })
        .from(clients)
        .where(and(eq(clients.tailorId, tailorId), eq(clients.id, id)))
        .limit(1);
      return rows[0] ?? null;
    };

    const remember = async (row: { id: string; fullName: string }) => {
      if (convo.clientId !== row.id) {
        await db
          .update(conversations)
          .set({ clientId: row.id })
          .where(eq(conversations.id, convo.id));
      }
      return row;
    };

    if (input.clientId) {
      // Scoped to this tailor, so a stray id cannot file a measurement into
      // somebody else's book.
      const picked = await load(input.clientId);
      if (!picked) throw new NotFoundException(`Client ${input.clientId} not found`);
      return remember(picked);
    }

    if (convo.clientId) {
      const linked = await load(convo.clientId);
      if (linked) return linked;
      // Deleted since. Fall through and work it out again.
    }

    const consumer = await db
      .select()
      .from(users)
      .where(eq(users.id, convo.clientUserId))
      .limit(1);
    const phone = input.clientPhone ?? consumer[0]?.phone ?? null;
    const name =
      input.clientName?.trim() || consumer[0]?.fullName?.trim() || 'Client from enquiry';

    if (phone) {
      const match = await db
        .select({ id: clients.id, fullName: clients.fullName })
        .from(clients)
        .where(and(eq(clients.tailorId, tailorId), eq(clients.phone, phone)))
        .limit(1);
      if (match[0]) return remember(match[0]);
    }

    const created = await this.clients.create(tailorId, {
      fullName: name,
      // Required by the client contract but genuinely unknown at enquiry time.
      // Placeholders keep the record creatable; the tailor fills them in from
      // the order screen.
      phone: phone ?? '—',
      address: '—',
    });
    return remember({ id: created.id, fullName: created.fullName });
  }

  // ── A measurement someone sent, kept ──────────────────────────────────────

  /**
   * File a measurement the client shared into the tailor's records.
   *
   * The numbers are read off the stored message rather than taken from the
   * request body: what ends up in a client's file has to be what was actually
   * sent, not what a request claims was sent.
   *
   * A snapshot, deliberately. The client can edit their own set afterwards and
   * this copy will not move — the measurements a garment was cut to should not
   * change under the tailor's feet. When they change, the client sends them
   * again.
   */
  async saveMeasurement(
    actor: ChatActor,
    conversationId: string,
    input: SaveChatMeasurementInput,
  ): Promise<SaveChatMeasurementResult> {
    const convo = await this.loadConversation(conversationId);
    const side = this.sideOf(convo, actor);
    if (side !== 'tailor' || !actor.tailorId) {
      throw new ForbiddenException('Only the tailor can save a measurement to a client');
    }
    const tailorId = actor.tailorId;
    const db = this.dbService.db;

    const rows = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, input.messageId), eq(messages.conversationId, convo.id)))
      .limit(1);
    const msg = rows[0];
    if (!msg) throw new NotFoundException(`Message ${input.messageId} not found`);

    const attachments = (msg.attachments ?? []) as MessageAttachment[];
    const attachment = attachments[input.attachmentIndex ?? 0];
    if (!attachment || attachment.kind !== 'measurement') {
      throw new BadRequestException('That message carries no measurement');
    }

    const client = await this.resolveClient(tailorId, convo, {
      clientId: input.clientId,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
    });

    const label = input.label?.trim() || attachment.label?.trim() || 'Sent in chat';

    if (input.replaceSetId) {
      // Scoped through getById, which refuses a set belonging to another
      // tailor — and we check it is this client's, so "replace" can never
      // quietly overwrite a different person's numbers.
      const existing = await this.measurementSets.getById(tailorId, input.replaceSetId);
      if (existing.clientId !== client.id) {
        throw new BadRequestException('That measurement set belongs to another client');
      }
      const updated = await this.measurementSets.update(tailorId, input.replaceSetId, {
        label,
        values: attachment.values,
        unitPreference: attachment.unitPreference,
      });
      return {
        clientId: client.id,
        clientName: client.fullName,
        measurementSetId: updated.id,
        replaced: true,
      };
    }

    const created = await this.measurementSets.createForClient(tailorId, client.id, {
      label,
      values: attachment.values,
      unitPreference: attachment.unitPreference,
    });
    return {
      clientId: client.id,
      clientName: client.fullName,
      measurementSetId: created.id,
      replaced: false,
    };
  }

  // ── Quote: chat → order → invoice (ROADMAP D.2.3, phase C3) ───────────────

  /**
   * Turn an inquiry thread into real work.
   *
   * This is the bridge between discovery and the order machinery that already
   * exists: it reuses OrdersService and InvoicesService rather than writing
   * orders directly, so a commission born in chat flows through exactly the
   * same lifecycle, audit timeline and invoicing as one taken at the counter.
   *
   * The inquiring consumer usually isn't in the tailor's client book yet, so
   * one is created on first quote. We match on phone when we have it — a
   * tailor who already knows this person shouldn't end up with a duplicate.
   */
  async createQuote(
    actor: ChatActor,
    conversationId: string,
    input: ConversationQuoteInput,
  ): Promise<ConversationQuoteResult> {
    const convo = await this.loadConversation(conversationId);
    const side = this.sideOf(convo, actor);
    if (side !== 'tailor' || !actor.tailorId) {
      throw new ForbiddenException('Only the tailor can create a quote');
    }
    const tailorId = actor.tailorId;
    const db = this.dbService.db;

    // Already quoted? Return the existing linkage instead of a second order.
    if (convo.orderId) {
      const existingInvoice = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(eq(invoices.orderId, convo.orderId))
        .limit(1);
      const order = await this.orders.getById(tailorId, convo.orderId);
      return {
        conversationId: convo.id,
        orderId: convo.orderId,
        invoiceId: existingInvoice[0]?.id ?? null,
        clientId: order.clientId,
      };
    }

    const { id: clientId } = await this.resolveClient(tailorId, convo, {
      clientName: input.clientName,
      clientPhone: input.clientPhone,
    });

    const order = await this.orders.create(tailorId, actor.userId, {
      clientId,
      orderName: input.orderName,
      dateDelivery: input.dateDelivery ?? null,
      notes: input.notes ?? null,
    });

    // A draft invoice is best-effort: the order is the thing that matters, and
    // a tailor can always invoice later from the order screen.
    let invoiceId: string | null = null;
    try {
      const invoice = await this.invoices.createForOrder(tailorId, order.id);
      invoiceId = invoice.id;
    } catch (err) {
      this.logger.warn(`Draft invoice for order ${order.id} not created: ${String(err)}`);
    }

    await db
      .update(conversations)
      .set({ orderId: order.id, origin: 'order' })
      .where(eq(conversations.id, convo.id));

    // Give the client a claim on the order they just commissioned.
    //
    // `order_claims` is THE order↔account link — `consumer.listOrders` reads
    // from it and `getOrder` authorises against it. Without this row the client
    // could be quoted, be notified about it, and then find the order missing
    // from their app and the notification's deep link 403ing. Idempotent, so
    // re-quoting an existing thread is safe.
    await db
      .insert(orderClaims)
      .values({ userId: convo.clientUserId, orderId: order.id, tailorId })
      .onConflictDoNothing();

    // Tell the CLIENT. Until now this endpoint turned an enquiry into a real
    // commission and told nobody — the client had to happen to reopen the
    // thread to discover they'd been quoted. Persisted AND pushed: this is
    // consequential, and money is exactly what someone comes back to re-read.
    const [tailorRow] = await db
      .select({ businessName: tailors.businessName })
      .from(tailors)
      .where(eq(tailors.id, tailorId))
      .limit(1);
    const shopName = tailorRow?.businessName ?? 'Your tailor';

    void this.notifications.emit(convo.clientUserId, {
      type: 'quote.received',
      params: { tailorName: shopName, orderName: input.orderName },
      entity: { type: 'order', id: order.id },
      push: {
        title: shopName,
        body: `Quote for “${input.orderName}”`,
        // entityType/entityId mirror the inbox row so tapping the push and
        // tapping the inbox row land in the same place.
        data: { type: 'quote.received', entityType: 'order', entityId: order.id },
      },
    });

    return { conversationId: convo.id, orderId: order.id, invoiceId, clientId };
  }

  // ── Reactions ─────────────────────────────────────────────────────────────

  /**
   * Toggle the caller's emoji reaction on a message (WhatsApp-style: one
   * reaction per person — a new emoji replaces theirs, the same emoji removes
   * it). The write lands on the `messages` row, so the other device learns of
   * it through the existing Realtime UPDATE subscription.
   */
  async toggleReaction(
    actor: ChatActor,
    conversationId: string,
    messageId: string,
    emoji: string,
  ): Promise<Message> {
    const db = this.dbService.db;
    const convo = await this.loadConversation(conversationId);
    const side = this.sideOf(convo, actor);
    const rows = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId)))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('Message not found');

    const current = (row.reactions as MessageReaction[]) ?? [];
    const mine = current.find((r) => r.actorId === actor.userId);
    const next: MessageReaction[] =
      mine && mine.emoji === emoji
        ? current.filter((r) => r.actorId !== actor.userId)
        : [...current.filter((r) => r.actorId !== actor.userId), { emoji, side, actorId: actor.userId }];

    const updated = await db
      .update(messages)
      .set({ reactions: next })
      .where(eq(messages.id, messageId))
      .returning();
    return (await this.projectMessages([updated[0]!]))[0]!;
  }

  // ── Share an order into a thread ──────────────────────────────────────────

  /**
   * Tailor drops one of their orders into the conversation. Besides posting the
   * order card, this links the order to the client's account via `order_claims`
   * (the same bridge `createQuote` uses) so the order shows up in the client's
   * Orders list with live status.
   */
  async shareOrder(
    actor: ChatActor,
    conversationId: string,
    input: { orderId: string; clientId?: string },
  ): Promise<Message> {
    const db = this.dbService.db;
    if (!actor.tailorId) throw new ForbiddenException('Only a tailor can share an order');
    const convo = await this.loadConversation(conversationId);
    const side = this.sideOf(convo, actor);
    if (side !== 'tailor') throw new ForbiddenException('Only the tailor can share an order');

    const found = await db
      .select({ id: orders.id, tailorId: orders.tailorId })
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1);
    const order = found[0];
    if (!order || order.tailorId !== actor.tailorId) throw new NotFoundException('Order not found');

    await db
      .insert(orderClaims)
      .values({ userId: convo.clientUserId, orderId: order.id, tailorId: actor.tailorId })
      .onConflictDoNothing();

    return this.postMessage(convo, actor, side, {
      attachments: [{ kind: 'order', orderId: order.id }],
      clientId: input.clientId,
    });
  }
}
