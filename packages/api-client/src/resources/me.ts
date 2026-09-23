import type { HttpClient } from '../http';
import type {
  CheckoutInput,
  CheckoutResult,
  DeletionState,
  PaymentAttempt,
  SubscriptionState,
  Tailor,
  User,
  UserRole,
} from '@seamflow/schemas';

export interface MeResponse {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  profile: User | null;
  tailor: Tailor | null;
  /**
   * Rides along on the call every screen already makes, so a pending deletion
   * surfaces the moment they sign in — which is the only reliable way someone
   * who changed their mind ever finds the cancel button.
   */
  deletion?: DeletionState;
  /** Trial countdown and entitlement. Null for an account with no shop. */
  subscription?: SubscriptionState | null;
}

export function makeMeResource(http: HttpClient) {
  return {
    /** GET /me — current user's profile + tailor (if any). */
    get(): Promise<MeResponse> {
      return http.get<MeResponse>('/me');
    },
    /**
     * GET /me/subscription — trial countdown, entitlement and usage. Also
     * arrives inside /me; this is for refreshing it on its own (e.g. after
     * returning from the upgrade screen).
     */
    subscription(): Promise<SubscriptionState> {
      return http.get<SubscriptionState>('/me/subscription');
    },
    /**
     * Start paying for a plan. Answers 503 `payments_unavailable` until a
     * provider is connected — the plans screen reads that as "coming soon"
     * rather than as a failure.
     */
    checkout(input: CheckoutInput): Promise<CheckoutResult> {
      return http.post<CheckoutResult>('/subscriptions/checkout', input);
    },
    /** Turn subscription emails on or off. */
    setEmailConsent(subscriptionEmails: boolean): Promise<{ subscriptionEmails: boolean }> {
      return http.patch<{ subscriptionEmails: boolean }>('/me/emails', { subscriptionEmails });
    },
    /** Poll while a mobile-money prompt is outstanding. */
    payment(id: string): Promise<PaymentAttempt> {
      return http.get<PaymentAttempt>(`/subscriptions/payments/${id}`);
    },
    payments(): Promise<{ items: PaymentAttempt[] }> {
      return http.get<{ items: PaymentAttempt[] }>('/subscriptions/payments');
    },
  };
}

export type MeResource = ReturnType<typeof makeMeResource>;
