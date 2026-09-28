import { Logger } from '@nestjs/common';
import {
  OtpDeliveryError,
  type OtpCheckInput,
  type OtpCheckOutcome,
  type OtpCheckResult,
  type OtpPhoneRisk,
  type OtpStartInput,
  type OtpStartResult,
  type OtpVerificationProvider,
} from './otp-provider';

/**
 * ============================================================================
 * Didit — WhatsApp-first phone verification.
 *
 * Two endpoints, one header, no workflow and no hosted flow: the standalone
 * phone API is authenticated by `x-api-key` alone. That is why this adapter is
 * short. Everything the vendor needs configuring lives in their console, not
 * here.
 *
 *   POST /v3/phone/send/   → they mint a code and deliver it
 *   POST /v3/phone/check/  → they judge the code and describe the line
 *
 * WHY THIS IS A 'verifies' PROVIDER
 *
 * We never see the digits. Didit generates the code, picks the channel, and
 * decides whether what the user typed was right. The consequence is that their
 * limits are the real limits, so `ttlMinutes` and `maxAttempts` below are
 * copied from their documentation rather than chosen by us — see the note on
 * each.
 *
 * WHATSAPP FIRST, SMS AUTOMATICALLY
 *
 * `preferred_channel` is a preference, not an instruction: Didit falls back to
 * SMS when a number has no WhatsApp. `verification_method` in the check
 * response says what actually carried it, which is the only honest thing to
 * record. Cameroon is a WhatsApp-first market, so this is the main reason to
 * use them over a plain SMS vendor.
 *
 * BILLING, AND THE ERROR YOU WILL SEE FIRST
 *
 * Phone verification is pay-as-you-go and is NOT part of Didit's free tier
 * (that covers full KYC only). Until an organisation's first top-up the module
 * is disabled outright and `send` answers 403 — verified against the live API,
 * whose exact words are "phone verification is disabled until your
 * organization's first top-up. You can still test it for free on a sandbox
 * application."
 *
 * That is blamed on 'config' below, not on the caller: the number is fine, the
 * account is empty. It shows the user "we couldn't send a code right now" and
 * puts the real reason in the server log, where someone can act on it. A key
 * from a SANDBOX application exercises this whole adapter for free, which is
 * how to test it without spending anything.
 * ============================================================================
 */

const BASE_URL = 'https://verification.didit.me';
/** A third party on the request path gets a leash. Their p99 is well inside this. */
const TIMEOUT_MS = 15_000;

/** What Didit answers `status` with on a send. */
type SendStatus = 'Success' | 'Retry' | 'Blocked';

interface SendResponse {
  request_id?: string;
  status?: SendStatus;
  reason?: string | null;
}

/** What Didit answers `status` with on a check. The space in the last one is theirs. */
type CheckStatus = 'Approved' | 'Declined' | 'Failed' | 'Expired or Not Found';

interface CheckResponse {
  request_id?: string;
  status?: CheckStatus;
  message?: string | null;
  phone?: {
    carrier?: { name?: string | null; type?: string | null } | null;
    is_virtual?: boolean;
    is_disposable?: boolean;
    verification_method?: string | null;
    warnings?: Array<{ feature?: string; risk?: string; short_description?: string }> | null;
    matches?: unknown[] | null;
  } | null;
}

export interface DiditOtpProviderOptions {
  apiKey: string;
  /** Overridable so a test can point at a local stub. */
  baseUrl?: string;
}

export class DiditOtpProvider implements OtpVerificationProvider {
  readonly mode = 'verifies' as const;
  readonly id = 'didit';
  /**
   * Didit can also do telegram, voice, rcs, viber and zalo. We expose only the
   * two the product actually offers — adding a channel is a product decision
   * with copy attached, not something to leak through because the vendor has it.
   */
  readonly channels = ['whatsapp', 'sms'] as const;
  /** Their window, not ours: codes are valid 5 minutes from the send. */
  readonly ttlMinutes = 5;
  /** Their budget: 3 code attempts, after which the session is finalised. */
  readonly maxAttempts = 3;

  private readonly logger = new Logger('DiditOtp');
  private readonly apiKey: string;
  private readonly baseUrl: string;

  // Explicit assignment rather than constructor parameter properties, so this
  // file can be imported by a test running under Node's type stripping.
  constructor(opts: DiditOtpProviderOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? BASE_URL).replace(/\/$/, '');
  }

  async start(input: OtpStartInput): Promise<OtpStartResult> {
    const body = await this.post<SendResponse>('/v3/phone/send/', {
      phone_number: input.toE164,
      options: {
        code_size: 6,
        preferred_channel: input.channel,
        locale: input.locale,
      },
      // Deliberately narrow. Platform and app version sharpen their duplicate
      // and device checks; we do not send the IP address, because a fraud
      // signal we have never needed is not worth handing a third party a map
      // of where our users are.
      ...(input.signals?.devicePlatform || input.signals?.appVersion
        ? {
            signals: {
              ...(input.signals.devicePlatform
                ? { device_platform: input.signals.devicePlatform }
                : {}),
              ...(input.signals.appVersion ? { app_version: input.signals.appVersion } : {}),
            },
          }
        : {}),
      ...(input.vendorData ? { vendor_data: input.vendorData } : {}),
    });

    // 'Retry' means their first hop failed and they tried another, free of
    // charge — a message is still on its way, so it is a success to us.
    if (body.status === 'Blocked') {
      throw new OtpDeliveryError(
        `Didit blocked that number (${body.reason ?? 'no reason given'}).`,
        'caller',
      );
    }
    if (body.status !== 'Success' && body.status !== 'Retry') {
      throw new OtpDeliveryError(
        `Didit answered an unexpected send status: ${String(body.status)}`,
        'provider',
      );
    }

    return { providerRef: body.request_id ?? null };
  }

  async check(input: OtpCheckInput): Promise<OtpCheckResult> {
    const body = await this.post<CheckResponse>('/v3/phone/check/', {
      phone_number: input.toE164,
      code: input.code,
      // Appendix J's one rule is that nothing blocks anyone. Didit can decline
      // a VoIP, disposable or already-seen number for us, and we deliberately
      // do not let it: the flags are recorded and a human reads them. An
      // automatic refusal here would lock out the honest edge cases (a shared
      // workshop line, a reseller's number) with no way to appeal.
      voip_number_action: 'NO_ACTION',
      disposable_number_action: 'NO_ACTION',
      duplicated_phone_number_action: 'NO_ACTION',
    });

    const outcome = OUTCOMES[body.status ?? 'Failed'] ?? 'wrong_code';
    return {
      outcome,
      risk: body.phone ? riskFrom(body.phone) : null,
      detail: body.message ?? null,
    };
  }

  /**
   * One request, one place for every failure mode.
   *
   * Their 502 (`phone_provider_unavailable`) is documented as unbilled and as
   * not consuming an attempt, so it is the one error genuinely worth retrying
   * and the service is told so.
   */
  private async post<T>(path: string, payload: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      const aborted = (err as Error)?.name === 'AbortError';
      throw new OtpDeliveryError(
        aborted ? 'Didit did not answer in time.' : 'Could not reach Didit.',
        'provider',
        err,
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    const parsed: unknown = text ? safeJson(text) : null;

    if (!res.ok) throw this.errorFor(res.status, parsed, text);

    if (!parsed || typeof parsed !== 'object') {
      throw new OtpDeliveryError('Didit answered with something that was not JSON.', 'provider');
    }
    return parsed as T;
  }

  private errorFor(status: number, parsed: unknown, raw: string): OtpDeliveryError {
    const detail = detailOf(parsed) ?? raw.slice(0, 200);
    const code = codeOf(parsed);

    if (status === 400) {
      // Their validation, which includes "this line type cannot receive a code".
      return new OtpDeliveryError(
        'That number cannot receive a verification code.',
        'caller',
        detail,
      );
    }
    if (status === 401 || status === 403) {
      // Three different things arrive as a 403, and only the vendor's own
      // sentence tells them apart — so it is logged verbatim. Whoever reads
      // this line will not have the docs open, so the options are spelled out.
      this.logger.error(
        `Didit refused the request (${status}): ${detail}\n` +
          'One of three things: (1) DIDIT_API_KEY is wrong or revoked; ' +
          '(2) the organisation has never topped up, which disables phone ' +
          'verification entirely — it is pay-as-you-go and is NOT part of the ' +
          'free tier; (3) the key belongs to an application without phone ' +
          'verification enabled. A SANDBOX application verifies phones for ' +
          'free, so the whole flow can be exercised before any money is spent.',
      );
      return new OtpDeliveryError('Didit rejected our credentials or balance.', 'config', detail);
    }
    if (status === 429) {
      return new OtpDeliveryError('Didit is rate limiting us.', 'rate', detail);
    }
    if (status === 502 && code === 'phone_provider_unavailable') {
      return new OtpDeliveryError('Didit’s upstream carrier is unavailable.', 'provider', detail);
    }
    return new OtpDeliveryError(`Didit answered ${status}.`, 'provider', detail);
  }
}

/**
 * Their four statuses, mapped to ours.
 *
 * 'Failed' is a wrong code with guesses left; 'Declined' is final, and is also
 * what the third wrong guess produces. Note that a Declined can carry a full
 * report — a correct code on a number their risk rules disliked — which is why
 * the risk fields are read on both.
 */
const OUTCOMES: Record<CheckStatus, OtpCheckOutcome> = {
  Approved: 'approved',
  Declined: 'declined',
  Failed: 'wrong_code',
  'Expired or Not Found': 'expired',
};

function riskFrom(phone: NonNullable<CheckResponse['phone']>): OtpPhoneRisk {
  return {
    carrier: phone.carrier?.name?.trim() || null,
    lineType: phone.carrier?.type ?? null,
    isVirtual: phone.is_virtual === true,
    isDisposable: phone.is_disposable === true,
    deliveredChannel: phone.verification_method ?? null,
    duplicateMatches: Array.isArray(phone.matches) ? phone.matches.length : 0,
    warnings: Array.isArray(phone.warnings)
      ? phone.warnings
          .map((w) => w?.feature ?? w?.short_description ?? w?.risk)
          .filter((w): w is string => typeof w === 'string' && w.length > 0)
      : [],
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Their errors are not uniformly shaped, so look in the usual places. */
function detailOf(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;
  for (const key of ['detail', 'message', 'error']) {
    if (typeof o[key] === 'string' && o[key]) return o[key] as string;
  }
  return null;
}

function codeOf(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const code = (parsed as Record<string, unknown>).code;
  return typeof code === 'string' ? code : null;
}
