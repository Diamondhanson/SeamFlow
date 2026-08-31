import { Logger } from '@nestjs/common';

/**
 * ============================================================================
 * OTP delivery providers.
 *
 * The WhatsApp provider is NOT chosen yet. This file is the seam where that
 * decision lands: implement `OtpDeliveryProvider`, register it in
 * `resolveOtpProvider`, add its env vars. Nothing else in the codebase should
 * learn the provider's name.
 *
 * What a provider is responsible for:
 *   - delivering `code` to `toE164` over `channel`
 *   - throwing `OtpDeliveryError` with `retryable` set honestly
 *   - returning a message id when it has one (support + reconciliation)
 *
 * What a provider is NOT responsible for — the service owns all of it, so no
 * two adapters can disagree:
 *   - generating or hashing the code
 *   - expiry, attempt counting, rate limiting
 *   - deciding whether to fall back from WhatsApp to SMS
 *
 * Candidates worth pricing when you get to it (all support WhatsApp OTP
 * templates): Meta's own WhatsApp Cloud API, Twilio, MessageBird, Termii or
 * Africa's Talking for better West/Central Africa routing. Meta Cloud API is
 * cheapest per message but requires Business verification (1–2 weeks) — the
 * same verification ROADMAP line 476 already anticipates for order updates, so
 * doing both at once is worth considering.
 * ============================================================================
 */

export type OtpChannel = 'whatsapp' | 'sms';

export interface OtpSendInput {
  /** Destination in E.164 (`+237…`). Already normalised and validated. */
  toE164: string;
  /** Plaintext code. Only the provider and the user ever see this. */
  code: string;
  channel: OtpChannel;
  /** Drives template selection for providers that localise. */
  locale: 'en' | 'fr' | 'pt' | 'es' | 'sw';
  /** Minutes until the code expires — most WhatsApp OTP templates show this. */
  ttlMinutes: number;
}

export interface OtpSendResult {
  /** Provider's own id, when it returns one. Stored for support lookups. */
  providerMessageId: string | null;
}

export interface OtpDeliveryProvider {
  /** Stable slug, persisted on the attempt row. e.g. 'console', 'meta-cloud'. */
  readonly id: string;
  /** Channels this adapter can actually deliver on. */
  readonly channels: readonly OtpChannel[];
  send(input: OtpSendInput): Promise<OtpSendResult>;
}

/**
 * A delivery failure.
 *
 * `retryable` distinguishes "the provider is down, try again" from "this number
 * cannot receive this" — the caller turns the first into a 503 and the second
 * into a 400, and only the second should burn the user's rate-limit budget.
 */
export class OtpDeliveryError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'OtpDeliveryError';
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
  readonly id = 'console';
  readonly channels = ['whatsapp', 'sms'] as const;
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
  readonly id = 'unconfigured';
  readonly channels = [] as const;

  send(): Promise<OtpSendResult> {
    return Promise.reject(
      new OtpDeliveryError(
        'No OTP delivery provider is configured. Set OTP_PROVIDER (and its ' +
          'credentials) to enable phone verification.',
        false,
      ),
    );
  }
}

/**
 * Pick the adapter for this environment.
 *
 * Add a `case` here when the provider is chosen — that plus the adapter file
 * plus its env vars is the entire remaining change.
 */
export function resolveOtpProvider(
  providerId: string | undefined,
  nodeEnv: string,
): OtpDeliveryProvider {
  switch (providerId) {
    case 'console':
      if (nodeEnv === 'production') {
        // Fail closed. See ConsoleOtpProvider's note.
        return new UnconfiguredOtpProvider();
      }
      return new ConsoleOtpProvider();

    // case 'meta-cloud':
    //   return new MetaCloudOtpProvider({ phoneNumberId, accessToken, template });

    default:
      return new UnconfiguredOtpProvider();
  }
}
