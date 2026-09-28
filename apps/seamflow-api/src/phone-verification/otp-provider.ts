import { Logger } from '@nestjs/common';

/**
 * ============================================================================
 * OTP providers, of which there are two KINDS.
 *
 * The original design here assumed every vendor would be a courier: we mint a
 * code, they deliver the string, and this service keeps every rule to itself.
 * That is `OtpDeliveryProvider`, and Meta's WhatsApp Cloud API is exactly that
 * shape.
 *
 * Didit is not. Its phone module mints the code, sends it, and verifies it —
 * you never see the digits. Forcing that into a "deliver this string" contract
 * would have meant lying about who owns the code, so the seam now names both
 * shapes and `mode` tells them apart:
 *
 *   mode: 'delivers'  → we mint, they carry.        (Meta, Twilio, Termii…)
 *   mode: 'verifies'  → they mint, carry and judge. (Didit)
 *
 * WHAT THE SERVICE STILL OWNS, IN BOTH MODES
 *
 * Choosing a vendor must never be able to weaken this feature, so the service
 * keeps everything it can keep regardless of mode:
 *
 *   - rate limiting per NUMBER (a vendor's own cap protects the vendor, not us)
 *   - one live challenge per user, and superseding the old one
 *   - the verify-then-write commit to `users.phone` + `phone_verified_at`
 *   - refusing to treat anything but an explicit approval as success
 *
 * What it can only own in 'delivers' mode is the code itself: generation,
 * hashing, comparison. In 'verifies' mode those move to the vendor, and the
 * vendor's limits become ours — see `ttlMinutes` and `maxAttempts` below,
 * which exist so the service never promises a window the vendor won't honour.
 * ============================================================================
 */

export type OtpChannel = 'whatsapp' | 'sms';

/** Values the apps already send as X-Client-Platform, passed through as a signal. */
export type OtpDevicePlatform = 'ios' | 'android' | 'web';

interface OtpProviderBase {
  /** Stable slug, persisted on the attempt row. e.g. 'console', 'didit'. */
  readonly id: string;
  /** Channels this adapter can actually deliver on. */
  readonly channels: readonly OtpChannel[];
  /**
   * How long a code stays valid, in minutes.
   *
   * Authoritative, not advisory: in 'verifies' mode this is the vendor's own
   * window, and the service must not tell a user they have ten minutes when
   * the vendor will stop accepting the code after five.
   */
  readonly ttlMinutes: number;
  /**
   * Wrong guesses allowed before the challenge is dead.
   *
   * Same reasoning. A vendor that finalises at three attempts makes our
   * fourth prompt a lie, so the service reads this rather than a constant.
   */
  readonly maxAttempts: number;
}

/** Context worth handing a vendor that scores risk. Never required. */
export interface OtpSignals {
  devicePlatform?: OtpDevicePlatform;
  appVersion?: string;
}

// ---------------------------------------------------------------------------
// mode: 'delivers' — we own the code
// ---------------------------------------------------------------------------

export interface OtpSendInput {
  /** Destination in E.164 (`+237…`). Already normalised and validated. */
  toE164: string;
  /** Plaintext code. Only the provider and the user ever see this. */
  code: string;
  channel: OtpChannel;
  /** Drives template selection for providers that localise. */
  locale: 'en' | 'fr' | 'pt' | 'es' | 'sw' | 'ar';
  /** Minutes until the code expires — most WhatsApp OTP templates show this. */
  ttlMinutes: number;
}

export interface OtpSendResult {
  /** Provider's own id, when it returns one. Stored for support lookups. */
  providerMessageId: string | null;
}

export interface OtpDeliveryProvider extends OtpProviderBase {
  readonly mode: 'delivers';
  send(input: OtpSendInput): Promise<OtpSendResult>;
}

// ---------------------------------------------------------------------------
// mode: 'verifies' — the vendor owns the code
// ---------------------------------------------------------------------------

export interface OtpStartInput {
  toE164: string;
  channel: OtpChannel;
  locale: 'en' | 'fr' | 'pt' | 'es' | 'sw' | 'ar';
  /** Our own id for this attempt, echoed back by the vendor for correlation. */
  vendorData?: string;
  signals?: OtpSignals;
}

export interface OtpStartResult {
  /** The vendor's handle on this challenge. Stored; needed for support. */
  providerRef: string | null;
}

export interface OtpCheckInput {
  toE164: string;
  code: string;
}

/**
 * Four outcomes, deliberately not two.
 *
 * 'wrong_code' leaves the challenge alive (the user gets another guess);
 * 'declined' and 'expired' kill it. Collapsing them would either give infinite
 * guesses or burn the challenge on one typo.
 */
export type OtpCheckOutcome = 'approved' | 'wrong_code' | 'declined' | 'expired';

/**
 * What the vendor learned about the line while verifying it.
 *
 * Kept because appendix J's review queue wants it: a "shop" on a burner VoIP
 * number, or one number already verified by three other accounts, is the
 * cheapest fraud signal there is. Never shown to a client, and nothing here
 * ever auto-rejects anyone — see J's one rule.
 */
export interface OtpPhoneRisk {
  carrier: string | null;
  /** 'mobile' | 'fixed_line' | 'voip' | … as the vendor names it. */
  lineType: string | null;
  isVirtual: boolean;
  isDisposable: boolean;
  /** The channel that actually delivered, which may not be the one we asked for. */
  deliveredChannel: string | null;
  /** Other accounts that have verified this same number. */
  duplicateMatches: number;
  warnings: string[];
}

export interface OtpCheckResult {
  outcome: OtpCheckOutcome;
  risk: OtpPhoneRisk | null;
  /** Vendor's words, for the log and for staff. Never shown to the user. */
  detail: string | null;
}

export interface OtpVerificationProvider extends OtpProviderBase {
  readonly mode: 'verifies';
  start(input: OtpStartInput): Promise<OtpStartResult>;
  check(input: OtpCheckInput): Promise<OtpCheckResult>;
}

export type OtpProvider = OtpDeliveryProvider | OtpVerificationProvider;

/**
 * Whose fault a send was.
 *
 * This started as a single `retryable` boolean and that was not enough. An
 * empty prepaid balance is not retryable, but telling the user their number is
 * invalid would be a lie — the number is fine, our account isn't. Naming the
 * blame lets the service pick both the right status code and the right person
 * to bother about it.
 */
export type OtpFailureBlame =
  /** This number cannot receive this. The user can fix it. → 400 */
  | 'caller'
  /** The vendor is down or wobbling. Nobody's fault, try later. → 503 */
  | 'provider'
  /** Our key, our balance, our configuration. → 503 and a loud log. */
  | 'config'
  /** Nothing is wrong, there has just been too much of it. → 429 */
  | 'rate';

/** A send or check that did not happen. */
export class OtpDeliveryError extends Error {
  readonly blame: OtpFailureBlame;
  readonly cause?: unknown;

  // Fields assigned explicitly rather than declared as constructor parameter
  // properties, so the adapters and this file can be imported by a test running
  // under Node's type stripping (`--experimental-strip-types`).
  constructor(message: string, blame: OtpFailureBlame, cause?: unknown) {
    super(message);
    this.name = 'OtpDeliveryError';
    this.blame = blame;
    this.cause = cause;
  }
}

/**
 * Development provider: logs the code instead of sending it.
 *
 * This is what makes the whole flow testable before a provider exists — the
 * client can drive start → confirm end to end and read the code off the API
 * logs. It refuses to run when NODE_ENV is production, because a "verified"
 * phone whose code was only ever printed to stdout is worse than no
 * verification at all: it looks trustworthy and isn't.
 */
export class ConsoleOtpProvider implements OtpDeliveryProvider {
  readonly mode = 'delivers' as const;
  readonly id = 'console';
  readonly channels = ['whatsapp', 'sms'] as const;
  readonly ttlMinutes = 10;
  readonly maxAttempts = 5;
  private readonly logger = new Logger('OtpDelivery');

  send(input: OtpSendInput): Promise<OtpSendResult> {
    this.logger.warn(
      `[DEV] would send ${input.channel} OTP to ${input.toE164}: ${input.code} ` +
        `(expires in ${input.ttlMinutes}m, locale ${input.locale})`,
    );
    return Promise.resolve({ providerMessageId: null });
  }
}

/**
 * Placeholder for every environment where no real provider is configured yet.
 *
 * Deliberately fails loudly rather than silently succeeding. A no-op that
 * returned success would mark phones verified that were never contacted.
 */
export class UnconfiguredOtpProvider implements OtpDeliveryProvider {
  readonly mode = 'delivers' as const;
  readonly id = 'unconfigured';
  readonly channels = [] as const;
  readonly ttlMinutes = 10;
  readonly maxAttempts = 5;

  send(): Promise<OtpSendResult> {
    return Promise.reject(
      new OtpDeliveryError(
        'No OTP delivery provider is configured. Set OTP_PROVIDER (and its ' +
          'credentials) to enable phone verification.',
        'config',
      ),
    );
  }
}
