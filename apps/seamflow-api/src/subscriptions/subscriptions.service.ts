// ============================================================================
// Entitlement — who is premium, and what a Free tailor may still do.
//
// ONE function decides: `stateFor()`. Every gate, every screen and every job
// reads it, so there is exactly one place where "is this tailor premium?" is
// answered. The app mirrors the answer to show or hide affordances, but it is
// never asked (appendix I.9) — a device deciding its own entitlement is a
// device that can lie.
//
// THE RULE THAT CANNOT BREAK (appendix I.1)
// Nothing in this file can hide or delete a tailor's own data. Caps only ever
// refuse to create something NEW, and a tailor who is over a cap after their
// trial keeps everything they made during it.
//
// WHY THE SWITCH EXISTS
// `SUBSCRIPTION_ENFORCEMENT` ships false. Trials run, the countdown shows, the
// upgrade screen works — but nothing is blocked, because there is no way to pay
// yet. Locking people out of features they cannot buy back is how you lose
// them. Entitlement is still tracked while the switch is off, so turning it on
// is one env var, not a migration.
// ============================================================================

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, count, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import {
  billingFor,
  FREE_CAPS,
  GRACE_DAYS,
  TRIAL_DAYS,
  planFor,
  type CapKind,
  type PremiumFeature,
  type SubscriptionPlan,
  type SubscriptionPaymentMethod,
  type SubscriptionState,
  type SubscriptionStatus,
} from '@seamflow/schemas';
import { ConfigService } from '@nestjs/config';
import { DbService } from '../db/db.service';
import { EmailService } from '../notifications/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { reminderEmail } from './subscription-emails';
import { PlatformSettingsService } from './platform-settings.service';
import {
  clients,
  notificationPreferences,
  users,
  orderPhotos,
  orders,
  subscriptionPayments,
  subscriptions,
  tailors,
} from '../db/schema';

type SubscriptionRow = typeof subscriptions.$inferSelect;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Days before the end on which a reminder goes out. Biggest first. */
const REMINDER_DAYS = [7, 3, 1, 0];

/**
 * Reminder copy, in the tailor's language. Written server-side because it is
 * sent long after the app last opened, so there is no device locale to read.
 *
 * STATUS ONLY, deliberately. A push lands on the App Store and Play builds,
 * where telling someone to renew — or where to do it — is exactly the
 * steering both stores forbid. The email carries the price and the link; the
 * push just says where things stand.
 */
const EXPIRY_PUSH: Record<string, { title: string; body: (days: number, paid: boolean) => string }> = {
  en: {
    title: 'SeamFlow',
    body: (d, paid) =>
      d === 0
        ? paid
          ? 'Your subscription ends today. Your work stays yours.'
          : 'Your free trial ends today. Your work stays yours.'
        : paid
          ? `Your subscription ends in ${d} day${d === 1 ? '' : 's'}.`
          : `Your free trial ends in ${d} day${d === 1 ? '' : 's'}.`,
  },
  fr: {
    title: 'SeamFlow',
    body: (d, paid) =>
      d === 0
        ? paid
          ? 'Votre abonnement se termine aujourd’hui. Votre travail reste le vôtre.'
          : 'Votre essai gratuit se termine aujourd’hui. Votre travail reste le vôtre.'
        : paid
          ? `Votre abonnement se termine dans ${d} jour${d === 1 ? '' : 's'}.`
          : `Votre essai gratuit se termine dans ${d} jour${d === 1 ? '' : 's'}.`,
  },
  pt: {
    title: 'SeamFlow',
    body: (d, paid) =>
      d === 0
        ? paid
          ? 'A sua subscrição termina hoje. O seu trabalho continua seu.'
          : 'O seu período gratuito termina hoje. O seu trabalho continua seu.'
        : paid
          ? `A sua subscrição termina em ${d} dia${d === 1 ? '' : 's'}.`
          : `O seu período gratuito termina em ${d} dia${d === 1 ? '' : 's'}.`,
  },
  es: {
    title: 'SeamFlow',
    body: (d, paid) =>
      d === 0
        ? paid
          ? 'Tu suscripción termina hoy. Tu trabajo sigue siendo tuyo.'
          : 'Tu prueba gratuita termina hoy. Tu trabajo sigue siendo tuyo.'
        : paid
          ? `Tu suscripción termina en ${d} día${d === 1 ? '' : 's'}.`
          : `Tu prueba gratuita termina en ${d} día${d === 1 ? '' : 's'}.`,
  },
  sw: {
    title: 'SeamFlow',
    body: (d, paid) =>
      d === 0
        ? paid
          ? 'Usajili wako unaisha leo. Kazi yako inabaki yako.'
          : 'Jaribio lako la bure linaisha leo. Kazi yako inabaki yako.'
        : paid
          ? `Usajili wako unaisha baada ya siku ${d}.`
          : `Jaribio lako la bure linaisha baada ya siku ${d}.`,
  },
  ar: {
    title: 'SeamFlow',
    body: (d, paid) =>
      d === 0
        ? paid
          ? 'ينتهي اشتراكك اليوم. عملك يبقى لك.'
          : 'تنتهي فترتك التجريبية اليوم. عملك يبقى لك.'
        : paid
          ? `ينتهي اشتراكك خلال ${d} يومًا.`
          : `تنتهي فترتك التجريبية خلال ${d} يومًا.`,
  },
};
const addDays = (from: Date, days: number) => new Date(from.getTime() + days * DAY_MS);
/** Whole days from now until `at`, floored at 0. */
const daysUntil = (at: Date | null): number =>
  at ? Math.max(0, Math.ceil((at.getTime() - Date.now()) / DAY_MS)) : 0;

/**
 * What a gate throws: HTTP 402 Payment Required.
 *
 * Deliberately not 403. A 403 means "not allowed", and the app's generic error
 * handling would show a dead end; 402 is unique to this one situation, so the
 * app can recognise it anywhere and open the upgrade sheet instead — naming
 * the feature or the cap that was hit.
 */
export class UpgradeRequiredError extends HttpException {
  constructor(
    readonly feature: PremiumFeature | null,
    readonly cap: CapKind | null,
    readonly limit: number | null,
  ) {
    super({ error: 'upgrade_required', feature, cap, limit }, HttpStatus.PAYMENT_REQUIRED);
  }
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly settings: PlatformSettingsService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  private get db() {
    return this.dbService.db;
  }

  /**
   * Whether the caps and gates actually bite. Off until payments are live, and
   * turned on from the ops dashboard — not by a deploy (see
   * PlatformSettingsService).
   */
  enforced(): Promise<boolean> {
    return this.settings.enforcementOn();
  }

  // ── The record ────────────────────────────────────────────────────────────

  /**
   * Every tailor has a subscription row from the moment their shop exists.
   * Created here rather than by a trigger so the trial length is one constant
   * in code, visible beside the rules it governs.
   */
  async ensureFor(tailorId: string): Promise<SubscriptionRow> {
    const existing = await this.rowFor(tailorId);
    if (existing) return existing;
    const [row] = await this.db
      .insert(subscriptions)
      .values({ tailorId, status: 'trialing', trialEndsAt: addDays(new Date(), TRIAL_DAYS) })
      .onConflictDoNothing()
      .returning();
    return row ?? (await this.rowFor(tailorId))!;
  }

  private async rowFor(tailorId: string): Promise<SubscriptionRow | null> {
    const rows = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tailorId, tailorId))
      .limit(1);
    return rows[0] ?? null;
  }

  // ── The one check ─────────────────────────────────────────────────────────

  /**
   * Premium right now?
   *
   * Computed from the dates rather than trusted from `status`, because a stored
   * status is only as fresh as the last job run — a trial that ended overnight
   * must not stay unlocked until 03:00 tomorrow.
   */
  private isPremiumRow(row: SubscriptionRow, now = new Date()): boolean {
    if (row.trialEndsAt > now) return true;
    if (row.premiumUntil && row.premiumUntil > now) return true;
    if (row.graceUntil && row.graceUntil > now) return true;
    return false;
  }

  private statusOf(row: SubscriptionRow, now = new Date()): SubscriptionStatus {
    if (row.premiumUntil && row.premiumUntil > now) return 'active';
    if (row.graceUntil && row.graceUntil > now) return 'grace';
    if (row.trialEndsAt > now) return 'trialing';
    return 'free';
  }

  async isPremium(tailorId: string): Promise<boolean> {
    const row = await this.ensureFor(tailorId);
    return this.isPremiumRow(row);
  }

  /** Everything a screen needs: state, dates, days left, usage, how to pay. */
  async stateFor(tailorId: string): Promise<SubscriptionState> {
    const row = await this.ensureFor(tailorId);
    const [shop] = await this.db
      .select({ countryCode: tailors.countryCode })
      .from(tailors)
      .where(eq(tailors.id, tailorId))
      .limit(1);
    const status = this.statusOf(row);
    const premium = this.isPremiumRow(row);
    const usage = await this.usageFor(tailorId);
    return {
      status,
      premium,
      trialEndsAt: row.trialEndsAt.toISOString(),
      premiumUntil: row.premiumUntil?.toISOString() ?? null,
      daysLeft: daysUntil(status === 'trialing' ? row.trialEndsAt : (row.premiumUntil ?? row.graceUntil)),
      plan: row.plan,
      method: row.method,
      enforced: await this.enforced(),
      usage,
      caps: FREE_CAPS,
      billing: billingFor(shop?.countryCode),
    };
  }

  /** Counts for the caps. Cheap enough per call; no denormalised counters to drift. */
  async usageFor(tailorId: string): Promise<{ clients: number; activeOrders: number; photos: number }> {
    const [clientRows, orderRows, photoRows] = await Promise.all([
      this.db.select({ n: count() }).from(clients).where(eq(clients.tailorId, tailorId)),
      this.db
        .select({ n: count() })
        .from(orders)
        .where(
          and(
            eq(orders.tailorId, tailorId),
            // "Active" = not finished. Delivering one frees a slot, which is
            // the behaviour a busy tailor can actually reason about.
            sql`${orders.status} <> 'delivered'`,
          ),
        ),
      this.db
        .select({ n: count() })
        .from(orderPhotos)
        .innerJoin(orders, eq(orders.id, orderPhotos.orderId))
        .where(eq(orders.tailorId, tailorId)),
    ]);
    return {
      clients: Number(clientRows[0]?.n ?? 0),
      activeOrders: Number(orderRows[0]?.n ?? 0),
      photos: Number(photoRows[0]?.n ?? 0),
    };
  }

  // ── The gates ─────────────────────────────────────────────────────────────

  /** Premium feature. Throws UpgradeRequiredError when it should be blocked. */
  async requireFeature(tailorId: string, feature: PremiumFeature): Promise<void> {
    if (!(await this.enforced())) return;
    if (await this.isPremium(tailorId)) return;
    throw new UpgradeRequiredError(feature, null, null);
  }

  /**
   * Room for one more? `cap` names what is being created, so the app can say
   * "you've reached 25 clients" rather than "forbidden".
   */
  async requireCapacity(tailorId: string, cap: CapKind): Promise<void> {
    if (!(await this.enforced())) return;
    if (await this.isPremium(tailorId)) return;
    const usage = await this.usageFor(tailorId);
    const limit =
      cap === 'clients' ? FREE_CAPS.clients : cap === 'active_orders' ? FREE_CAPS.activeOrders : FREE_CAPS.photos;
    const used = cap === 'clients' ? usage.clients : cap === 'active_orders' ? usage.activeOrders : usage.photos;
    if (used < limit) return;
    throw new UpgradeRequiredError(null, cap, limit);
  }

  // ── Moving the date ───────────────────────────────────────────────────────

  /**
   * Add days to the one date, the only way it ever moves.
   *
   * The stacking rule (appendix I.5): days are added to whichever is later —
   * today, or the time already paid for. A tailor who renews early loses
   * nothing, which is exactly the behaviour that makes renewing early safe.
   */
  async extendPremium(
    tailorId: string,
    days: number,
    opts: { plan?: SubscriptionPlan; method?: SubscriptionPaymentMethod; reason?: string } = {},
  ): Promise<SubscriptionRow> {
    const row = await this.ensureFor(tailorId);
    const now = new Date();
    const candidates = [now, row.premiumUntil, row.trialEndsAt].filter(
      (d): d is Date => !!d && d > now,
    );
    const base = candidates.length
      ? new Date(Math.max(...candidates.map((d) => d.getTime())))
      : now;
    const premiumUntil = addDays(base, days);
    const [updated] = await this.db
      .update(subscriptions)
      .set({
        premiumUntil,
        status: premiumUntil > now ? 'active' : 'free',
        // A successful payment ends any dunning window.
        graceUntil: null,
        plan: opts.plan ?? row.plan,
        method: opts.method ?? row.method,
        lastPaymentAt: opts.method ? now : row.lastPaymentAt,
        updatedAt: now,
      })
      .where(eq(subscriptions.tailorId, tailorId))
      .returning();
    this.logger.log(
      `Tailor ${tailorId}: +${days} day(s)${opts.reason ? ` (${opts.reason})` : ''} → ${premiumUntil.toISOString()}`,
    );
    return updated!;
  }

  /** Move a trial's end date. The safety net if payments are delayed. */
  async extendTrial(tailorId: string, days: number): Promise<SubscriptionRow> {
    const row = await this.ensureFor(tailorId);
    const now = new Date();
    const base = row.trialEndsAt > now ? row.trialEndsAt : now;
    const trialEndsAt = addDays(base, days);
    const [updated] = await this.db
      .update(subscriptions)
      .set({ trialEndsAt, status: this.statusOf({ ...row, trialEndsAt }), updatedAt: now })
      .where(eq(subscriptions.tailorId, tailorId))
      .returning();
    return updated!;
  }

  /** Same, for every tailor at once — one click when a provider slips. */
  async extendAllTrials(days: number): Promise<number> {
    const rows = await this.db
      .update(subscriptions)
      .set({
        trialEndsAt: sql`greatest(${subscriptions.trialEndsAt}, now()) + make_interval(days => ${days})`,
        updatedAt: new Date(),
      })
      .returning({ id: subscriptions.id });
    this.logger.log(`Extended ${rows.length} trial(s) by ${days} day(s)`);
    return rows.length;
  }

  /**
   * Record a paid subscription and extend the date. This is what a provider
   * webhook will call once one exists; the payment plumbing around it — the
   * history row, the stacking, the state change — is finished now so that
   * plugging a provider in is a matter of calling this with a verified event.
   *
   * Idempotent on (provider, providerRef): the same confirmation delivered
   * twice pays once.
   */
  async recordPayment(input: {
    tailorId: string;
    plan: SubscriptionPlan;
    method: SubscriptionPaymentMethod;
    amount: number;
    currency?: string;
    provider: string;
    providerRef: string;
  }): Promise<{ applied: boolean; row: SubscriptionRow }> {
    const { tailorId, plan, method, provider, providerRef } = input;
    const existing = await this.db
      .select({ id: subscriptionPayments.id, status: subscriptionPayments.status })
      .from(subscriptionPayments)
      .where(
        and(
          eq(subscriptionPayments.provider, provider),
          eq(subscriptionPayments.providerRef, providerRef),
        ),
      )
      .limit(1);
    if (existing[0]?.status === 'succeeded') {
      return { applied: false, row: await this.ensureFor(tailorId) };
    }

    const days = planFor(plan).days;
    await this.db
      .insert(subscriptionPayments)
      .values({
        tailorId,
        amount: String(input.amount),
        currency: input.currency ?? 'XAF',
        method,
        plan,
        daysAdded: days,
        provider,
        providerRef,
        status: 'succeeded',
      })
      .onConflictDoNothing();
    const row = await this.extendPremium(tailorId, days, { plan, method, reason: provider });
    return { applied: true, row };
  }

  /**
   * The language to write to this tailor in. Only tailors have a setting; a
   * missing one means English rather than a guess from the device, because a
   * push is written server-side long after the app last opened.
   */
  async languageFor(tailorId: string): Promise<string> {
    const [pref] = await this.db
      .select({ language: notificationPreferences.language })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.tailorId, tailorId))
      .limit(1);
    return pref?.language ?? 'en';
  }

  /** Card dunning (appendix I.6): keep access while retries run. */
  async startGrace(tailorId: string): Promise<void> {
    await this.db
      .update(subscriptions)
      .set({ graceUntil: addDays(new Date(), GRACE_DAYS), status: 'grace', updatedAt: new Date() })
      .where(eq(subscriptions.tailorId, tailorId));
  }

  // ── Housekeeping ──────────────────────────────────────────────────────────

  /**
   * Bring stored statuses in line with the dates. Entitlement never depends on
   * this having run — `stateFor` computes from dates — but the admin inbox and
   * any "who is on Free?" query read the column, so it is kept honest.
   */
  async syncStatuses(): Promise<number> {
    const now = new Date();
    const rows = await this.db
      .update(subscriptions)
      .set({ status: 'free', updatedAt: now })
      .where(
        and(
          inArray(subscriptions.status, ['trialing', 'active', 'grace']),
          lte(subscriptions.trialEndsAt, now),
          or(isNull(subscriptions.premiumUntil), lte(subscriptions.premiumUntil, now)),
          or(isNull(subscriptions.graceUntil), lte(subscriptions.graceUntil, now)),
        ),
      )
      .returning({ id: subscriptions.id });
    return rows.length;
  }

  /**
   * Nudge people before their time runs out (appendix I.5).
   *
   * Mobile money cannot auto-renew, so a reminder IS the renewal mechanism —
   * a tailor who forgets simply stops being premium. Sent at 7, 3 and 1 days
   * out and on the day itself, for trials and paid time alike, because the
   * experience of "it stopped and nobody told me" is identical either way.
   *
   * Runs once a day at a fixed hour and matches on whole days remaining, so a
   * given tailor gets each of the four at most once.
   */
  @Cron('0 9 * * *')
  async renewalReminders(): Promise<{ sent: number; emailed: number }> {
    if (!this.dbService.isConfigured()) return { sent: 0, emailed: 0 };
    let emailed = 0;
    try {
      const rows = await this.db
        .select({
          tailorId: subscriptions.tailorId,
          userId: tailors.userId,
          countryCode: tailors.countryCode,
          trialEndsAt: subscriptions.trialEndsAt,
          premiumUntil: subscriptions.premiumUntil,
        })
        .from(subscriptions)
        .innerJoin(tailors, eq(tailors.id, subscriptions.tailorId));

      let sent = 0;
      for (const row of rows) {
        const endsAt =
          row.premiumUntil && row.premiumUntil > new Date() ? row.premiumUntil : row.trialEndsAt;
        const days = daysUntil(endsAt);
        if (!REMINDER_DAYS.includes(days)) continue;
        // Never nag someone who is already paid up well beyond this window.
        if (row.premiumUntil && daysUntil(row.premiumUntil) > REMINDER_DAYS[0]!) continue;

        const paid = !!row.premiumUntil && row.premiumUntil > new Date();
        const language = await this.languageFor(row.tailorId);
        const copy = EXPIRY_PUSH[language] ?? EXPIRY_PUSH.en!;
        if (await this.emailReminder(row.userId, row.countryCode, language, days, paid)) emailed++;
        await this.notifications.emit(row.userId, {
          type: 'subscription.expiring',
          params: { days: String(days), paid: String(paid) },
          // Push only: the plans screen is the record, and an inbox entry that
          // repeats four times would read as pestering.
          persist: false,
          push: { title: copy.title, body: copy.body(days, paid), data: { screen: 'upgrade' } },
        });
        sent++;
      }
      if (sent) this.logger.log(`Sent ${sent} renewal reminder(s), ${emailed} by email`);
      return { sent, emailed };
    } catch (err) {
      this.logger.error(`Renewal reminders failed: ${(err as Error).message}`);
      return { sent: 0, emailed };
    }
  }

  /**
   * The email half of a reminder — and the important half.
   *
   * The apps may not say what premium costs or where to buy it, so this is
   * where that is said. Only to tailors who have an address on file and have
   * not turned these off; Apple allows contacting a user about payment
   * outside the app when they consented, and consent is a column, not an
   * assumption.
   */
  private async emailReminder(
    userId: string,
    countryCode: string | null,
    language: string,
    days: number,
    paid: boolean,
  ): Promise<boolean> {
    const [user] = await this.db
      .select({ email: users.email, optIn: users.subscriptionEmailsOptIn })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user?.email || !user.optIn) return false;
    const url = `${this.config.get<string>('APP_WEB_URL') ?? 'https://app.seamflowtech.com'}/upgrade`;
    const copy = reminderEmail(language, { days, paid, billing: billingFor(countryCode), url });
    return this.email.send({ to: user.email, subject: copy.subject, text: copy.text });
  }

  /**
   * Nightly: keep the stored status column honest, and make sure no tailor is
   * missing a subscription row. Neither affects entitlement — that is computed
   * from dates on every request — so a missed run costs nothing.
   */
  @Cron('10 4 * * *')
  async nightly(): Promise<void> {
    if (!this.dbService.isConfigured()) return;
    try {
      const created = await this.ensureAll();
      const lapsed = await this.syncStatuses();
      if (created || lapsed) {
        this.logger.log(`Subscriptions: ${created} row(s) created, ${lapsed} moved to free`);
      }
    } catch (err) {
      this.logger.error(`Subscription housekeeping failed: ${(err as Error).message}`);
    }
  }

  /** Backfill: a subscription row for every tailor that somehow lacks one. */
  async ensureAll(): Promise<number> {
    const missing = await this.db
      .select({ id: tailors.id })
      .from(tailors)
      .leftJoin(subscriptions, eq(subscriptions.tailorId, tailors.id))
      .where(isNull(subscriptions.id));
    for (const t of missing) await this.ensureFor(t.id);
    return missing.length;
  }
}
