import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, asc, desc, eq, lt, sql } from 'drizzle-orm';
import type {
  SupportAttachment,
  SupportMessage,
  SupportMessageCreateInput,
  SupportStaffReplyInput,
  SupportStaffTicketDetail,
  SupportStatus,
  SupportTicket,
  SupportTicketCreateInput,
  SupportTicketDetail,
} from '@seamflow/schemas';
import { DbService } from '../db/db.service';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  notificationPreferences,
  orderClaims,
  orders,
  supportMessages,
  supportTickets,
  tailors,
  users,
} from '../db/schema';

export const SUPPORT_BUCKET = 'support-media';
const SIGNED_URL_TTL_S = 60 * 60;
const SUBJECT_MAX = 80;
const PREVIEW_MAX = 140;
/** A ticket left on "waiting on you" this long closes itself (plan step 2). */
const AUTO_CLOSE_DAYS = 7;

/**
 * Push copy for a staff reply, in the recipient's language. Rendered here
 * because only the sender knows who is receiving it; the ticket number is
 * kept in every language so it matches what the user sees in the app.
 */
const REPLY_PUSH: Record<string, { title: string; body: (ref: string) => string }> = {
  en: { title: 'SeamFlow Support', body: (r) => `New reply on ${r}` },
  fr: { title: 'Support SeamFlow', body: (r) => `Nouvelle réponse sur ${r}` },
  pt: { title: 'Suporte SeamFlow', body: (r) => `Nova resposta em ${r}` },
  es: { title: 'Soporte SeamFlow', body: (r) => `Nueva respuesta en ${r}` },
  sw: { title: 'Msaada wa SeamFlow', body: (r) => `Jibu jipya kwenye ${r}` },
  ar: { title: 'دعم SeamFlow', body: (r) => `رد جديد على ${r}` },
};

type TicketRow = typeof supportTickets.$inferSelect;
type MessageRow = typeof supportMessages.$inferSelect;

/** First line of what they wrote, trimmed to fit a list row. */
function subjectOf(body: string): string {
  const line = body.split('\n').find((l) => l.trim())?.trim() ?? body.trim();
  return line.length > SUBJECT_MAX ? `${line.slice(0, SUBJECT_MAX - 1)}…` : line;
}

function previewOf(body: string, attachments: number): string {
  const text = body.replace(/\s+/g, ' ').trim();
  if (text) return text.length > PREVIEW_MAX ? `${text.slice(0, PREVIEW_MAX - 1)}…` : text;
  // Rendered by the app as a camera glyph; kept language-neutral on purpose.
  return attachments > 0 ? '📷' : '';
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  private get db() {
    return this.dbService.db;
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  async list(userId: string): Promise<{ items: SupportTicket[] }> {
    const rows = await this.db
      .select({ t: supportTickets, orderName: orders.orderName })
      .from(supportTickets)
      .leftJoin(orders, eq(orders.id, supportTickets.orderId))
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.lastMessageAt))
      .limit(100);
    return { items: rows.map((r) => this.toTicket(r.t, r.orderName)) };
  }

  /** Opening a ticket also marks SeamFlow's replies as read. */
  async get(userId: string, id: string): Promise<SupportTicketDetail> {
    const row = await this.loadOwned(userId, id);
    if (row.t.userUnread > 0) {
      await this.db
        .update(supportTickets)
        .set({ userUnread: 0 })
        .where(eq(supportTickets.id, id));
      row.t.userUnread = 0;
    }
    const msgs = await this.db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.ticketId, id))
      .orderBy(asc(supportMessages.createdAt));
    return {
      ticket: this.toTicket(row.t, row.orderName),
      messages: await this.toMessages(msgs),
    };
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  async create(userId: string, input: SupportTicketCreateInput): Promise<SupportTicketDetail> {
    const attachments = this.checkAttachments(userId, input.attachments);
    if (input.orderId) await this.assertOrderAccess(userId, input.orderId);

    // Idempotent on (user, clientId): a retried submit returns the first ticket.
    const existing = await this.db
      .select({ id: supportTickets.id })
      .from(supportTickets)
      .where(and(eq(supportTickets.userId, userId), eq(supportTickets.clientId, input.clientId)))
      .limit(1);
    if (existing[0]) return this.get(userId, existing[0].id);

    const ticketId = await this.db.transaction(async (tx) => {
      const [t] = await tx
        .insert(supportTickets)
        .values({
          userId,
          side: input.side,
          category: input.category,
          subject: subjectOf(input.body),
          orderId: input.orderId ?? null,
          clientId: input.clientId,
          lastMessagePreview: previewOf(input.body, attachments.length),
          supportUnread: 1,
        })
        .returning({ id: supportTickets.id });
      await tx.insert(supportMessages).values({
        ticketId: t!.id,
        sender: 'user',
        senderUserId: userId,
        body: input.body,
        attachments,
        clientId: input.clientId,
      });
      return t!.id;
    });
    this.logger.log(`Support ticket ${ticketId} opened (${input.side}/${input.category})`);
    return this.get(userId, ticketId);
  }

  /**
   * A user reply always hands the ticket back to SeamFlow: "waiting on you"
   * becomes open, and a resolved ticket reopens — the problem evidently isn't.
   */
  async reply(
    userId: string,
    id: string,
    input: SupportMessageCreateInput,
  ): Promise<SupportMessage> {
    await this.loadOwned(userId, id);
    const attachments = this.checkAttachments(userId, input.attachments);
    const body = input.body ?? '';

    const dup = await this.db
      .select()
      .from(supportMessages)
      .where(and(eq(supportMessages.ticketId, id), eq(supportMessages.clientId, input.clientId)))
      .limit(1);
    if (dup[0]) return (await this.toMessages(dup))[0]!;

    const [msg] = await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(supportMessages)
        .values({
          ticketId: id,
          sender: 'user',
          senderUserId: userId,
          body,
          attachments,
          clientId: input.clientId,
        })
        .returning();
      await tx
        .update(supportTickets)
        .set({
          status: 'open',
          resolvedAt: null,
          lastMessageAt: new Date(),
          lastMessagePreview: previewOf(body, attachments.length),
          supportUnread: sql`${supportTickets.supportUnread} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(supportTickets.id, id));
      return inserted;
    });
    return (await this.toMessages([msg!]))[0]!;
  }

  /** "My problem is solved." Reopening happens by replying. */
  async resolve(userId: string, id: string): Promise<SupportTicket> {
    await this.loadOwned(userId, id);
    await this.db
      .update(supportTickets)
      .set({ status: 'resolved', resolvedAt: new Date(), updatedAt: new Date() })
      .where(eq(supportTickets.id, id));
    const row = await this.loadOwned(userId, id);
    return this.toTicket(row.t, row.orderName);
  }


  // ── Staff (admin inbox) ───────────────────────────────────────────────────

  async staffGet(id: string): Promise<SupportStaffTicketDetail> {
    const row = await this.loadAny(id);
    if (row.t.supportUnread > 0) {
      await this.db.update(supportTickets).set({ supportUnread: 0 }).where(eq(supportTickets.id, id));
    }
    const [who] = await this.db
      .select({
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        createdAt: users.createdAt,
        businessName: tailors.businessName,
      })
      .from(users)
      .leftJoin(tailors, eq(tailors.userId, users.id))
      .where(eq(users.id, row.t.userId))
      .limit(1);
    const msgs = await this.db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.ticketId, id))
      .orderBy(asc(supportMessages.createdAt));
    return {
      ticket: this.toTicket(row.t, row.orderName),
      messages: await this.toMessages(msgs),
      requester: {
        userId: row.t.userId,
        fullName: who?.fullName ?? '',
        email: who?.email ?? null,
        phone: who?.phone ?? null,
        businessName: who?.businessName ?? null,
        joinedAt: (who?.createdAt ?? row.t.createdAt).toISOString(),
      },
    };
  }

  /** SeamFlow answers. Moves the ticket to the chosen status and pushes the user. */
  async staffReply(
    staffUserId: string,
    id: string,
    input: SupportStaffReplyInput,
  ): Promise<SupportMessage> {
    const row = await this.loadAny(id);

    const dup = await this.db
      .select()
      .from(supportMessages)
      .where(and(eq(supportMessages.ticketId, id), eq(supportMessages.clientId, input.clientId)))
      .limit(1);
    if (dup[0]) return (await this.toMessages(dup))[0]!;

    const [msg] = await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(supportMessages)
        .values({
          ticketId: id,
          sender: 'support',
          senderUserId: staffUserId,
          body: input.body,
          attachments: [],
          clientId: input.clientId,
        })
        .returning();
      await tx
        .update(supportTickets)
        .set({
          status: input.status,
          resolvedAt: input.status === 'resolved' ? new Date() : null,
          lastMessageAt: new Date(),
          lastMessagePreview: previewOf(input.body, 0),
          userUnread: sql`${supportTickets.userUnread} + 1`,
          supportUnread: 0,
          updatedAt: new Date(),
        })
        .where(eq(supportTickets.id, id));
      return inserted;
    });

    await this.pushReply(row.t);
    return (await this.toMessages([msg!]))[0]!;
  }

  async staffSetStatus(id: string, status: SupportStatus): Promise<SupportTicket> {
    await this.loadAny(id);
    await this.db
      .update(supportTickets)
      .set({
        status,
        resolvedAt: status === 'resolved' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, id));
    const row = await this.loadAny(id);
    return this.toTicket(row.t, row.orderName);
  }

  /**
   * Close tickets left on "waiting on you" for a week. Keeps the inbox honest —
   * a ticket nobody is going to answer isn't open — and the user can reopen it
   * any time just by replying.
   */
  @Cron('40 * * * *')
  async autoCloseStale(): Promise<void> {
    if (!this.dbService.isConfigured()) return;
    const cutoff = new Date(Date.now() - AUTO_CLOSE_DAYS * 24 * 60 * 60 * 1000);
    const closed = await this.db
      .update(supportTickets)
      .set({ status: 'resolved', resolvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(supportTickets.status, 'waiting_on_user'), lt(supportTickets.lastMessageAt, cutoff)))
      .returning({ id: supportTickets.id });
    if (closed.length) this.logger.log(`Auto-closed ${closed.length} stale support ticket(s)`);
  }

  private async pushReply(t: TicketRow): Promise<void> {
    // Tailors have a language setting; customers don't yet, so they get English.
    const [pref] = await this.db
      .select({ language: notificationPreferences.language })
      .from(notificationPreferences)
      .innerJoin(tailors, eq(tailors.id, notificationPreferences.tailorId))
      .where(eq(tailors.userId, t.userId))
      .limit(1);
    const copy = REPLY_PUSH[pref?.language ?? 'en'] ?? REPLY_PUSH.en!;
    const ref = `SF-${t.number}`;
    await this.notifications.emit(t.userId, {
      type: 'support.replied',
      entity: { type: 'support_ticket', id: t.id },
      // The ticket is the record, exactly like a chat thread.
      persist: false,
      push: {
        title: copy.title,
        body: copy.body(ref),
        // Opens the ticket in whichever side of the app it was written from.
        data: { entityType: 'support_ticket', entityId: t.id, recipientSide: t.side },
      },
    });
  }

  private async loadAny(id: string) {
    const rows = await this.db
      .select({ t: supportTickets, orderName: orders.orderName })
      .from(supportTickets)
      .leftJoin(orders, eq(orders.id, supportTickets.orderId))
      .where(eq(supportTickets.id, id))
      .limit(1);
    if (!rows[0]) throw new NotFoundException('Ticket not found');
    return rows[0];
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  private async loadOwned(userId: string, id: string) {
    const rows = await this.db
      .select({ t: supportTickets, orderName: orders.orderName })
      .from(supportTickets)
      .leftJoin(orders, eq(orders.id, supportTickets.orderId))
      .where(eq(supportTickets.id, id))
      .limit(1);
    const row = rows[0];
    // Same 404 for "not yours" as "doesn't exist": ticket ids aren't guessable,
    // but there's no reason to confirm one exists to someone who doesn't own it.
    if (!row || row.t.userId !== userId) throw new NotFoundException('Ticket not found');
    return row;
  }

  /**
   * Screenshots must sit under the caller's own folder. Without this a user
   * could name another user's path and get it signed back to them.
   */
  private checkAttachments(userId: string, list?: SupportAttachment[]): SupportAttachment[] {
    const prefix = `${userId}/`;
    return (list ?? []).map((a) => {
      if (!a.storagePath.startsWith(prefix) || (a.thumbnailPath && !a.thumbnailPath.startsWith(prefix))) {
        throw new ForbiddenException('Attachment is not yours');
      }
      // Never store URLs — they're short-lived and re-signed on every read.
      return {
        storagePath: a.storagePath,
        thumbnailPath: a.thumbnailPath ?? null,
        width: a.width ?? null,
        height: a.height ?? null,
      };
    });
  }

  /** An order the caller makes (as a tailor) or has claimed (as a customer). */
  private async assertOrderAccess(userId: string, orderId: string): Promise<void> {
    const owned = await this.db
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(tailors, eq(tailors.id, orders.tailorId))
      .where(and(eq(orders.id, orderId), eq(tailors.userId, userId)))
      .limit(1);
    if (owned[0]) return;
    const claimed = await this.db
      .select({ id: orderClaims.id })
      .from(orderClaims)
      .where(and(eq(orderClaims.orderId, orderId), eq(orderClaims.userId, userId)))
      .limit(1);
    if (claimed[0]) return;
    throw new BadRequestException('That order is not linked to your account');
  }

  // ── Mapping ───────────────────────────────────────────────────────────────

  private toTicket(t: TicketRow, orderName: string | null): SupportTicket {
    return {
      id: t.id,
      number: t.number,
      side: t.side,
      category: t.category,
      status: t.status,
      subject: t.subject,
      orderId: t.orderId,
      orderName: orderName ?? null,
      lastMessageAt: t.lastMessageAt.toISOString(),
      lastMessagePreview: t.lastMessagePreview,
      unread: t.userUnread,
      createdAt: t.createdAt.toISOString(),
      resolvedAt: t.resolvedAt ? t.resolvedAt.toISOString() : null,
    };
  }

  /** Sign every screenshot on a page of messages in ONE storage call. */
  private async toMessages(rows: MessageRow[]): Promise<SupportMessage[]> {
    const paths: string[] = [];
    for (const r of rows) {
      for (const a of r.attachments as SupportAttachment[]) {
        paths.push(a.storagePath);
        if (a.thumbnailPath) paths.push(a.thumbnailPath);
      }
    }
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data, error } = await this.supabase
        .admin()
        .storage.from(SUPPORT_BUCKET)
        .createSignedUrls(paths, SIGNED_URL_TTL_S);
      if (error) this.logger.warn(`Could not sign support attachments: ${error.message}`);
      for (const e of data ?? []) if (e.signedUrl && e.path) signed.set(e.path, e.signedUrl);
    }
    return rows.map((r) => ({
      id: r.id,
      ticketId: r.ticketId,
      sender: r.sender,
      body: r.body,
      attachments: (r.attachments as SupportAttachment[]).map((a) => ({
        ...a,
        url: signed.get(a.storagePath),
        thumbnailUrl: a.thumbnailPath ? signed.get(a.thumbnailPath) : undefined,
      })),
      clientId: r.clientId,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
