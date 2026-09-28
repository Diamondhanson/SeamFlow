import type { HttpClient } from '../http';
import type {
  CheckoutInput,
  CheckoutResult,
  DeletionState,
  PaymentAttempt,
  PhoneVerifyStartInput,
  PhoneVerifyStartResult,
  PhoneVerifyStatus,
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
  /**
   * Set while this account may not write. Optional because an older app build
   * and a cached response both predate it; absent means not suspended.
   */
  suspension?: { since: string; reason: string | null } | null;
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

    /**
     * GET /me/phone — is this account's number proven?
     *
     * `enabled` is false when the server has no OTP provider configured. Read
     * it before offering the flow: the endpoints answer 503 otherwise, and an
     * entry point that can only fail is worse than no entry point.
     */
    phoneStatus(): Promise<PhoneVerifyStatus> {
      return http.get<PhoneVerifyStatus>('/me/phone');
    },

    /**
     * POST /me/phone/start — send a code, WhatsApp first.
     *
     * Pass the number exactly as the user typed it plus `defaultCountry`; the
     * server normalises to E.164 so the app never reimplements phone parsing.
     * Render the `ttlMinutes` that comes back rather than assuming one — it is
     * the provider's window, and providers disagree.
     */
    startPhoneVerification(input: PhoneVerifyStartInput): Promise<PhoneVerifyStartResult> {
      return http.post<PhoneVerifyStartResult>('/me/phone/start', input);
    },

    /**
     * POST /me/phone/confirm — prove it.
     *
     * On success the number is committed to the account and
     * `phoneVerifiedAt` is set. Every failure answers the same 400, on purpose:
     * telling a caller whether a code was wrong, expired or never existed tells
     * an attacker which knob to turn.
     */
    confirmPhoneVerification(code: string): Promise<{ phone: string; verifiedAt: string }> {
      return http.post<{ phone: string; verifiedAt: string }>('/me/phone/confirm', { code });
    },
  };
}

export type MeResource = ReturnType<typeof makeMeResource>;
