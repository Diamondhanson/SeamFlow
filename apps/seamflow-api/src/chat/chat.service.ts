import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
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
} from '@seamflow/schemas';
import { DbService } from '../db/db.service';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersService } from '../orders/orders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { ClientsService } from '../clients/clients.service';
import {
  clients,
  conversations,
  feedPosts,
  invoices,
  messages,
  tailors,
  users,
} from '../db/schema';

const CHAT_BUCKET = 'chat-media';
const FEED_BUCKET = 'feed';
const AVATARS_BUCKET = 'avatars';
const SIGNED_URL_TTL_S = 60 * 60;

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
    const imagePaths: string[] = [];
    for (const r of rows) {
      for (const a of (r.attachments as MessageAttachment[]) ?? []) {
        if (a.kind === 'image') {
          imagePaths.push(a.storagePath);
          if (a.thumbnailPath) imagePaths.push(a.thumbnailPath);
        }
      }
    }
    const signed = await this.signChatPaths([...new Set(imagePaths)]);

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
        return a;
      });
      byMessage.set(r.id, hydrated);
    }
    return byMessage;
  }

  private toMessage(row: MessageRow, attachments: MessageAttachment[]): Message {
    return {
      id: row.id,
      conversationId: row.conversationId,
      senderType: row.senderType,
      senderUserId: row.senderUserId,
      body: row.body ?? null,
      attachments,
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
          caption: p.caption ?? null,
          garmentType: p.garmentType ?? null,
        };
      }
    }

    return {
      id: convo.id,
      origin: convo.origin,
      counterparty,
      design,
      orderId: convo.orderId ?? null,
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
    params: { cursor?: string; limit?: number },
  ): Promise<MessagePage> {
    const convo = await this.loadConversation(conversationId);
    this.sideOf(convo, actor); // access check

    const limit = Math.min(Math.max(params.limit ?? 30, 1), 100);
    const conditions: SQL[] = [eq(messages.conversationId, conversationId)];
    const cur = this.decodeCursor(params.cursor);
    if (cur) {
      conditions.push(
        sql`(${messages.createdAt}, ${messages.id}) < (${cur.at.toISOString()}::timestamptz, ${cur.id}::uuid)`,
      );
    }

    const rows = await this.dbService.db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const attachments = await this.hydrateAttachments(page);
    const last = page[page.length - 1];

    return {
      items: page.map((r) => this.toMessage(r, attachments.get(r.id) ?? [])),
      nextCursor: hasMore && last ? this.encodeCursor(last.createdAt, last.id) : null,
    };
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
        const hydrated = await this.hydrateAttachments([dup[0]]);
        return this.toMessage(dup[0], hydrated.get(dup[0].id) ?? []);
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

    const hydrated = await this.hydrateAttachments([row]);
    return this.toMessage(row, hydrated.get(row.id) ?? []);
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

    // Resolve (or create) the client record for the inquiring consumer.
    const consumer = await db
      .select()
      .from(users)
      .where(eq(users.id, convo.clientUserId))
      .limit(1);
    const phone = input.clientPhone ?? consumer[0]?.phone ?? null;
    const name =
      input.clientName?.trim() || consumer[0]?.fullName?.trim() || 'Client from enquiry';

    let clientId: string | null = null;
    if (phone) {
      const match = await db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.tailorId, tailorId), eq(clients.phone, phone)))
        .limit(1);
      clientId = match[0]?.id ?? null;
    }
    if (!clientId) {
      const created = await this.clients.create(tailorId, {
        fullName: name,
        // These are required by the client contract but genuinely unknown at
        // enquiry time. Placeholders keep the record creatable; the tailor
        // fills them in from the order screen.
        phone: phone ?? '—',
        address: '—',
      });
      clientId = created.id;
    }

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
}
