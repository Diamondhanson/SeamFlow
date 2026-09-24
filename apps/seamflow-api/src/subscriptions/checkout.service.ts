// ============================================================================
// Buying a subscription: start a payment, then believe only the provider.
//
// The shape is the one thing that matters here. A payment is started by the
// app, but it is NEVER the app that says it succeeded — the confirmation comes
// from the provider's webhook, verified by signature, and only that path moves
// the date. A client-reported success is how subscriptions get given away.
//
// Both halves are finished; the provider behind them is not chosen yet
// (see providers/payment-provider.ts).
// ============================================================================

import { Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { and, desc, eq, gte, isNotNull } from 'drizzle-orm';
import {
  billingFor,
  planFor,
  type CheckoutInput,
  type CheckoutResult,
  type PaymentAttempt,
} from '@seamflow/schemas';
import { DbService } from '../db/db.service';
import { NotificationsService } from '../notifications/notifications.service';
import { subscriptionPayments, tailors } from '../db/schema';
import { SubscriptionsService } from './subscriptions.service';
import { PAYMENT_PROVIDER } from './providers/payment-provider.factory';
import type { PaymentProvider, WebhookEvent } from './providers/payment-provider';

/** How soon the app should ask again while a mobile-money prompt is pending. */
const POLL_AFTER_MS = 5_000;

const PAID_PUSH: Record<string, { title: string; body: (until: string) => string }> = {
  en: { title: 'SeamFlow', body: (d) => `Payment received. Premium until ${d}.` },
  fr: { title: 'SeamFlow', body: (d) => `Paiement reçu. Premium jusqu’au ${d}.` },
  pt: { title: 'SeamFlow', body: (d) => `Pagamento recebido. Premium até ${d}.` },
  es: { title: 'SeamFlow', body: (d) => `Pago recibido. Premium hasta el ${d}.` },
  sw: { title: 'SeamFlow', body: (d) => `Malipo yamepokelewa. Premium hadi ${d}.` },
  ar: { title: 'SeamFlow', body: (d) => `تم استلام الدفعة. بريميوم حتى ${d}.` },
};

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly subscriptions: SubscriptionsService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  private get db() {
    return this.dbService.db;
  }

  get providerName(): string {
    return this.provider.name;
  }

  /** Start a payment. Returns what the app needs to finish it on the phone. */
  async start(tailorId: string, input: CheckoutInput): Promise<CheckoutResult> {
    if (!this.provider.isConfigured()) {
      // The plans screen already says this; the API says the same thing rather
      // than failing in a way the app would have to guess about.
      throw new ServiceUnavailableException({
        error: 'payments_unavailable',
        message: 'Subscriptions cannot be bought yet — no payment provider is connected.',
      });
    }

    const [shop] = await this.db
      .select({ countryCode: tailors.countryCode })
      .from(tailors)
      .where(eq(tailors.id, tailorId))
      .limit(1);
    const billing = billingFor(shop?.countryCode);
    if (!billing.methods.includes(input.method) || !this.provider.supports(input.method)) {
      throw new ServiceUnavailableException({
        error: 'method_unavailable',
        message: `${input.method} is not available for this account.`,
      });
    }

    const amount = billing.prices[input.plan];
    // The attempt is recorded BEFORE the provider is called, so a provider that
    // succeeds and then fails to answer us still has a row its webhook can find.
    const [attempt] = await this.db
      .insert(subscriptionPayments)
      .values({
        tailorId,
        amount: String(amount),
        currency: billing.currency,
        method: input.method,
        plan: input.plan,
        daysAdded: planFor(input.plan).days,
        provider: this.provider.name,
        status: 'pending',
      })
      .returning();

    try {
      const started = await this.provider.start({
        paymentId: attempt!.id,
        tailorId,
        plan: input.plan,
        method: input.method,
        amount,
        currency: billing.currency,
        phone: input.phone,
        // Where a hosted checkout sends them afterwards. Back to the plans
        // screen, which is already polling and will show the result itself.
        returnUrl: `${(this.config.get<string>('APP_WEB_URL') ?? 'https://app.seamflowtech.com').replace(/\/$/, '')}/upgrade`,
      });
      await this.db
        .update(subscriptionPayments)
        .set({ providerRef: started.providerRef, updatedAt: new Date() })
        .where(eq(subscriptionPayments.id, attempt!.id));

      // Some rails settle synchronously. Treat that exactly like a webhook.
      if (started.status === 'succeeded') {
        await this.settle({
          providerRef: started.providerRef,
          paymentId: attempt!.id,
          status: 'succeeded',
        });
      }

      return {
        paymentId: attempt!.id,
        status: started.status,
        redirectUrl: started.redirectUrl ?? null,
        instruction: started.instruction ?? 'none',
        pollAfterMs: POLL_AFTER_MS,
      };
    } catch (err) {
      await this.db
        .update(subscriptionPayments)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(subscriptionPayments.id, attempt!.id));
      this.logger.error(`Checkout failed for tailor ${tailorId}: ${(err as Error).message}`);
      throw err;
    }
  }

  /** The app polls this while a mobile-money prompt is outstanding. */
  async attempt(tailorId: string, paymentId: string): Promise<PaymentAttempt> {
    const rows = await this.db
      .select()
      .from(subscriptionPayments)
      .where(and(eq(subscriptionPayments.id, paymentId), eq(subscriptionPayments.tailorId, tailorId)))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('Payment not found');
    return {
      id: row.id,
      status: row.status,
      plan: row.plan,
      method: row.method,
      amount: Number(row.amount),
      currency: row.currency,
      daysAdded: row.daysAdded,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async history(tailorId: string): Promise<{ items: PaymentAttempt[] }> {
    const rows = await this.db
      .select()
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.tailorId, tailorId))
      .orderBy(desc(subscriptionPayments.createdAt))
      .limit(50);
    return {
      items: rows.map((row) => ({
        id: row.id,
        status: row.status,
        plan: row.plan,
        method: row.method,
        amount: Number(row.amount),
        currency: row.currency,
        daysAdded: row.daysAdded,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  /**
   * A webhook arrived. Verify it through the provider, then — and only then —
   * move the date.
   */
  async handleWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): Promise<{ handled: boolean }> {
    const event = this.provider.parseWebhook(headers, rawBody);
    if (!event) {
      // Unverified: not an error to report back in detail. Anyone can POST here.
      this.logger.warn('Rejected an unverified subscription webhook');
      return { handled: false };
    }
    return this.settle(event);
  }

  private async settle(event: WebhookEvent): Promise<{ handled: boolean }> {
    const rows = await this.db
      .select()
      .from(subscriptionPayments)
      .where(
        event.paymentId
          ? eq(subscriptionPayments.id, event.paymentId)
          : eq(subscriptionPayments.providerRef, event.providerRef),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      this.logger.warn(`Webhook for unknown payment ${event.providerRef}`);
      return { handled: false };
    }
    // Already settled: a provider re-delivering is normal, and must be a no-op.
    if (row.status === 'succeeded') return { handled: true };

    if (event.status !== 'succeeded') {
      await this.db
        .update(subscriptionPayments)
        .set({ status: event.status === 'failed' ? 'failed' : 'pending', updatedAt: new Date() })
        .where(eq(subscriptionPayments.id, row.id));
      return { handled: true };
    }

    await this.db
      .update(subscriptionPayments)
      .set({ status: 'succeeded', providerRef: event.providerRef, updatedAt: new Date() })
      .where(eq(subscriptionPayments.id, row.id));
    const updated = await this.subscriptions.extendPremium(row.tailorId, row.daysAdded, {
      plan: row.plan ?? undefined,
      method: row.method ?? undefined,
      reason: `${row.provider ?? 'provider'} payment`,
    });
    await this.notifyPaid(row.tailorId, updated.premiumUntil);
    this.logger.log(`Subscription paid: tailor ${row.tailorId}, +${row.daysAdded} days`);
    return { handled: true };
  }

  /**
   * Catch payments whose webhook never arrived.
   *
   * Fapshi sends exactly one webhook per event, whether or not we answer it,
   * so a deploy, a cold start or a dropped connection at the wrong moment
   * means a tailor has paid and nothing happened. Every few minutes this asks
   * the provider directly about attempts still pending, and settles whatever
   * it finds. Only looks at the last day: older than that, a pending payment
   * was abandoned, and Fapshi expires its own links after 24 hours anyway.
   */
  @Cron('*/10 * * * *')
  async reconcilePending(): Promise<{ checked: number; settled: number }> {
    if (!this.dbService.isConfigured()) return { checked: 0, settled: 0 };
    if (!this.provider.isConfigured() || !this.provider.fetchStatus) return { checked: 0, settled: 0 };

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pending = await this.db
      .select()
      .from(subscriptionPayments)
      .where(
        and(
          eq(subscriptionPayments.status, 'pending'),
          eq(subscriptionPayments.provider, this.provider.name),
          isNotNull(subscriptionPayments.providerRef),
          gte(subscriptionPayments.createdAt, since),
        ),
      )
      .limit(50);

    let settled = 0;
    for (const row of pending) {
      try {
        const event = await this.provider.fetchStatus(row.providerRef!);
        if (!event || event.status === 'pending') continue;
        await this.settle({ ...event, paymentId: row.id });
        if (event.status === 'succeeded') settled++;
      } catch (err) {
        this.logger.warn(`Reconcile failed for ${row.providerRef}: ${(err as Error).message}`);
      }
    }
    if (settled) this.logger.log(`Reconciled ${settled} payment(s) whose webhook never arrived`);
    return { checked: pending.length, settled };
  }

  private async notifyPaid(tailorId: string, premiumUntil: Date | null): Promise<void> {
    const [shop] = await this.db
      .select({ userId: tailors.userId })
      .from(tailors)
      .where(eq(tailors.id, tailorId))
      .limit(1);
    if (!shop?.userId || !premiumUntil) return;
    const language = await this.subscriptions.languageFor(tailorId);
    const copy = PAID_PUSH[language] ?? PAID_PUSH.en!;
    await this.notifications.emit(shop.userId, {
      type: 'payment.confirmed',
      params: { until: premiumUntil.toISOString() },
      push: { title: copy.title, body: copy.body(premiumUntil.toLocaleDateString(language)) },
      persist: true,
    });
  }
}
