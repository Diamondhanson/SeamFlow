// ============================================================================
// A provider that is not a provider — for development and the test suite.
//
// It exists so the ENTIRE payment path can be exercised before a real rail is
// chosen: start a collection, receive a signed webhook, verify it, extend the
// one date, notify the tailor. When Fapshi or a card processor is plugged in,
// the only thing that should need proving is their signature format — every
// other step has already been run hundreds of times through this.
//
// Signed with HMAC-SHA256 over the raw body, the way most providers do it, so
// the verification code path here is the same shape as a real one. Refuses to
// load outside development, because a provider that mints its own successful
// payments must never exist in production.
// ============================================================================

import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  PaymentProvider,
  StartPaymentInput,
  StartPaymentResult,
  WebhookEvent,
} from './payment-provider';
import type { SubscriptionPaymentMethod } from '@seamflow/schemas';

export const FAKE_PROVIDER_SECRET = 'fake-provider-secret-for-tests-only';

export class FakePaymentProvider implements PaymentProvider {
  readonly name = 'fake';

  constructor(private readonly nodeEnv: string) {
    if (nodeEnv === 'production') {
      throw new Error('FakePaymentProvider must never be used in production');
    }
  }

  isConfigured(): boolean {
    return this.nodeEnv !== 'production';
  }

  supports(_method: SubscriptionPaymentMethod): boolean {
    return true;
  }

  /** Never settles on its own: the test drives the webhook, like real life. */
  async start(input: StartPaymentInput): Promise<StartPaymentResult> {
    return {
      providerRef: `fake_${input.paymentId}`,
      status: 'pending',
      redirectUrl: input.method === 'card' ? `https://example.invalid/pay/${input.paymentId}` : null,
      instruction: input.method === 'card' ? 'follow_link' : 'approve_on_phone',
    };
  }

  parseWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): WebhookEvent | null {
    const given = String(headers['x-fake-signature'] ?? '');
    const expected = createHmac('sha256', FAKE_PROVIDER_SECRET).update(rawBody).digest('hex');
    // Constant-time, and length-checked first because timingSafeEqual throws
    // on a length mismatch — which would itself leak the expected length.
    if (given.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return null;

    const body = JSON.parse(rawBody) as {
      ref?: string;
      paymentId?: string;
      status?: WebhookEvent['status'];
      amount?: number;
      currency?: string;
    };
    if (!body.ref || !body.status) return null;
    return {
      providerRef: body.ref,
      paymentId: body.paymentId ?? null,
      status: body.status,
      amount: body.amount ?? null,
      currency: body.currency ?? null,
    };
  }
}
