// ============================================================================
// Fapshi — MTN MoMo and Orange Money collections in Cameroon.
//
// The first real rail behind the PaymentProvider seam. Everything else about
// subscriptions was built and tested before this existed, so this file does
// exactly two things: start a collection, and tell us what a webhook means.
//
// HOW A PAYMENT ACTUALLY GOES
//   1. We call POST /initiate-pay with the amount and our own payment id as
//      `externalId`. Fapshi answers with a hosted checkout `link` and a
//      `transId`.
//   2. The tailor opens that link, picks MoMo or Orange, and approves on their
//      handset. None of that happens in our app.
//   3. Fapshi POSTs the transaction to our webhook when it becomes SUCCESSFUL,
//      FAILED or EXPIRED. Only that moves the subscription date.
//
// TWO THINGS TO KNOW
//   · Fapshi sends ONE webhook per event, whether or not we answer. Our route
//     always returns 200, and nothing below throws on a body it cannot read.
//   · Cards are not a Fapshi product. `supports()` says so rather than failing
//     later, which is what makes the app offer only what can be honoured.
// ============================================================================

import { Logger } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import type { SubscriptionPaymentMethod } from '@seamflow/schemas';
import type {
  PaymentProvider,
  StartPaymentInput,
  StartPaymentResult,
  WebhookEvent,
} from './payment-provider';

const SANDBOX_URL = 'https://sandbox.fapshi.com';
const LIVE_URL = 'https://live.fapshi.com';
/** Fapshi refuses anything smaller. Our cheapest plan is 3,000, so this is a
 *  guard against a mis-set price rather than a real limit. */
const MIN_XAF = 100;

interface InitiatePayResponse {
  message?: string;
  link?: string;
  transId?: string;
  dateInitiated?: string;
}

interface FapshiTransaction {
  transId?: string;
  status?: 'CREATED' | 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'EXPIRED';
  medium?: string;
  amount?: number;
  externalId?: string;
  userId?: string;
}

export class FapshiPaymentProvider implements PaymentProvider {
  readonly name = 'fapshi';
  private readonly logger = new Logger(FapshiPaymentProvider.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    // Sandbox unless explicitly told otherwise: a mistake here spends real
    // money, so live has to be asked for by name.
    return this.config.get<string>('FAPSHI_ENV') === 'live' ? LIVE_URL : SANDBOX_URL;
  }

  private get credentials(): { apiuser: string; apikey: string } | null {
    const apiuser = this.config.get<string>('FAPSHI_API_USER');
    const apikey = this.config.get<string>('FAPSHI_API_KEY');
    return apiuser && apikey ? { apiuser, apikey } : null;
  }

  isConfigured(): boolean {
    return !!this.credentials;
  }

  /** Mobile money only. Fapshi does not do cards, and pretending otherwise
   *  would show a tailor abroad a button that always fails. */
  supports(method: SubscriptionPaymentMethod): boolean {
    return method === 'mtn_momo' || method === 'orange_money';
  }

  async start(input: StartPaymentInput): Promise<StartPaymentResult> {
    const creds = this.credentials;
    if (!creds) throw new Error('Fapshi credentials are not configured');
    if (input.currency !== 'XAF') {
      throw new Error(`Fapshi collects in XAF; asked for ${input.currency}`);
    }
    const amount = Math.round(input.amount);
    if (amount < MIN_XAF) throw new Error(`Fapshi minimum is ${MIN_XAF} XAF`);

    const res = await fetch(`${this.baseUrl}/initiate-pay`, {
      method: 'POST',
      headers: { ...creds, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        // Our own id, echoed back on the webhook. This is what ties a
        // confirmation to the attempt we recorded before calling out.
        externalId: input.paymentId,
        userId: input.tailorId,
        redirectUrl: input.returnUrl,
        message: 'SeamFlow subscription',
      }),
    });

    const body = (await res.json().catch(() => ({}))) as InitiatePayResponse & { message?: string };
    if (!res.ok || !body.link || !body.transId) {
      // 403 with valid keys usually means this server's IP is not on the
      // dashboard's whitelist — worth saying, because the message alone
      // ("Forbidden") sends people looking in the wrong place.
      const hint = res.status === 403 ? ' (is this server IP whitelisted on the Fapshi dashboard?)' : '';
      throw new Error(`Fapshi initiate-pay failed: ${res.status} ${body.message ?? ''}${hint}`);
    }

    return {
      providerRef: body.transId,
      status: 'pending',
      redirectUrl: body.link,
      // Fapshi hosts the checkout: the tailor picks their operator there, then
      // approves on the handset.
      instruction: 'follow_link',
    };
  }

  /**
   * Verify and read a webhook.
   *
   * Fapshi signs by echoing a shared secret in `x-wh-secret` rather than by
   * hashing the body. That is weaker than an HMAC — anyone who ever sees the
   * header has it forever — so the secret is long, lives only in the server
   * environment, and is compared in constant time. Without a configured
   * secret we refuse everything: an open webhook that grants subscriptions is
   * not a webhook, it is a giveaway.
   */
  parseWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): WebhookEvent | null {
    const expected = this.config.get<string>('FAPSHI_WEBHOOK_SECRET');
    if (!expected) {
      this.logger.error('FAPSHI_WEBHOOK_SECRET is not set — refusing every webhook');
      return null;
    }
    const given = String(headers['x-wh-secret'] ?? '');
    if (given.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return null;

    let tx: FapshiTransaction;
    try {
      tx = JSON.parse(rawBody) as FapshiTransaction;
    } catch {
      this.logger.warn('Fapshi webhook body was not JSON');
      return null;
    }
    if (!tx.transId || !tx.status) return null;

    return {
      providerRef: tx.transId,
      // Our payment id, so settlement finds the row even if the reference was
      // never stored (a webhook that beats our own response, say).
      paymentId: tx.externalId ?? null,
      status:
        tx.status === 'SUCCESSFUL'
          ? 'succeeded'
          : tx.status === 'FAILED' || tx.status === 'EXPIRED'
            ? 'failed'
            : 'pending',
      amount: tx.amount ?? null,
      currency: 'XAF',
    };
  }

  /**
   * Ask Fapshi what a transaction's status is.
   *
   * Not part of the normal flow — webhooks are — but a webhook can be missed,
   * and a tailor staring at "waiting for your confirmation" after paying is
   * the worst failure this system has. Rate limited to 6/minute per
   * transaction by Fapshi, so it is for reconciliation, never polling.
   */
  async fetchStatus(transId: string): Promise<WebhookEvent | null> {
    const creds = this.credentials;
    if (!creds) return null;
    const res = await fetch(`${this.baseUrl}/payment-status/${encodeURIComponent(transId)}`, {
      headers: creds,
    });
    if (!res.ok) return null;
    const tx = (await res.json().catch(() => ({}))) as FapshiTransaction;
    if (!tx.transId || !tx.status) return null;
    return {
      providerRef: tx.transId,
      paymentId: tx.externalId ?? null,
      status:
        tx.status === 'SUCCESSFUL'
          ? 'succeeded'
          : tx.status === 'FAILED' || tx.status === 'EXPIRED'
            ? 'failed'
            : 'pending',
      amount: tx.amount ?? null,
      currency: 'XAF',
    };
  }
}
