// ============================================================================
// The payment provider seam.
//
// Everything about subscriptions is finished except the rails. This is the
// ONE interface a real provider has to satisfy — Fapshi for MTN MoMo and
// Orange Money, a card processor for the rest — and the only place that has to
// change when one is chosen. Nothing above it knows a provider's name.
//
// It is deliberately small. Two things happen in a subscription payment:
// something is started, and later something confirms it. Everything else —
// the money, the days, the history, the notification, the one date — already
// lives in SubscriptionsService, where it stays provider-agnostic.
//
// WHAT A REAL PROVIDER MUST DO
//   start()          begin a collection and return its own reference
//   parseWebhook()   VERIFY the signature, then say which payment this is
//                    about and whether it succeeded. Returning `null` for an
//                    unverified body is what stops anyone granting themselves
//                    a subscription by POSTing to the webhook URL.
//
// Card auto-renewal (appendix I.6) adds `chargeSaved()` later; it is left out
// until there is a provider whose tokenisation shape we can honour, rather
// than guessed at now and rewritten then.
// ============================================================================

import type { SubscriptionPaymentMethod, SubscriptionPlan } from '@seamflow/schemas';

export interface StartPaymentInput {
  /** Our own id for this attempt; send it to the provider as metadata. */
  paymentId: string;
  tailorId: string;
  plan: SubscriptionPlan;
  method: SubscriptionPaymentMethod;
  amount: number;
  currency: string;
  /** Mobile money: the number to prompt. */
  phone?: string;
  /** Where a card flow should return the browser to. */
  returnUrl?: string;
}

export interface StartPaymentResult {
  /** The provider's reference. Stored, and matched against the webhook. */
  providerRef: string;
  status: 'pending' | 'succeeded' | 'failed';
  redirectUrl?: string | null;
  instruction?: 'approve_on_phone' | 'follow_link' | 'none';
}

export interface WebhookEvent {
  providerRef: string;
  /** Our payment id, when the provider echoes the metadata back. */
  paymentId?: string | null;
  status: 'succeeded' | 'failed' | 'pending';
  /** What the provider says was actually paid, for the record. */
  amount?: number | null;
  currency?: string | null;
}

export interface PaymentProvider {
  /** Short name, stored on every payment row: 'fapshi', 'flutterwave', … */
  readonly name: string;
  /** False when credentials are missing — checkout then answers 503. */
  isConfigured(): boolean;
  /** Which methods this provider can actually take. */
  supports(method: SubscriptionPaymentMethod): boolean;
  start(input: StartPaymentInput): Promise<StartPaymentResult>;
  /**
   * Verify and interpret a webhook. MUST return null unless the signature
   * checks out — this is the door to the money.
   */
  parseWebhook(headers: Record<string, string | string[] | undefined>, rawBody: string): WebhookEvent | null;
  /**
   * Ask the provider what a transaction's status is.
   *
   * Optional, because not every rail offers it — but where it exists it is
   * the answer to the worst failure this system has: a tailor who paid, whose
   * webhook never arrived, staring at "waiting for your confirmation". The
   * reconcile job (CheckoutService) uses it as a safety net, never as a
   * substitute for webhooks.
   */
  fetchStatus?(providerRef: string): Promise<WebhookEvent | null>;
}

/**
 * The provider in place today: none.
 *
 * Checkout answers "not available yet" rather than failing obscurely, which is
 * exactly what the app is already telling tailors on the plans screen. Every
 * other part of the system runs as if payments were live, so the day a real
 * provider lands, this file is the only thing that changes.
 */
export class NullPaymentProvider implements PaymentProvider {
  readonly name = 'none';
  isConfigured(): boolean {
    return false;
  }
  supports(): boolean {
    return false;
  }
  async start(): Promise<StartPaymentResult> {
    throw new Error('No payment provider is configured');
  }
  parseWebhook(): WebhookEvent | null {
    return null;
  }
}
