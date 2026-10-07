import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { CountryCode } from 'libphonenumber-js';
import { normalizePhone } from '@seamflow/utils';
import { ConfigService } from '@nestjs/config';
import { DbService } from '../db/db.service';
import { PlatformSettingsService } from '../subscriptions/platform-settings.service';
import { phoneVerifications, users } from '../db/schema';
import {
  OtpDeliveryError,
  type OtpChannel,
  type OtpPhoneRisk,
  type OtpProvider,
  type OtpSignals,
} from './otp-provider';
import { resolveOtpProvider } from './resolve-otp-provider';

/**
 * Sends allowed to one number per window — each one costs money.
 *
 * Ours, not the vendor's. Didit allows four an hour; that cap exists to protect
 * Didit's carriers, not our balance or the person whose phone is buzzing, so we
 * keep our own stricter one in front of it.
 */
const MAX_SENDS_PER_WINDOW = 3;
const SEND_WINDOW_MINUTES = 60;

/**
 * Phone verification via a one-time code.
 *
 * Two kinds of provider exist (see otp-provider.ts): one delivers a code we
 * minted, the other mints and judges its own. This service owns everything it
 * can own in BOTH cases, so that choosing a vendor can never weaken the
 * feature:
 *
 *   - rate limiting per number, and one live challenge per user
 *   - the verify-then-write commit: `users.phone` is only updated after a
 *     challenge against the new number succeeds, so a typo or a hostile number
 *     can never displace one that already works
 *   - treating nothing but an explicit approval as success
 *
 * In 'delivers' mode it also owns the code itself — generation, keyed hashing,
 * constant-time comparison. In 'verifies' mode the vendor owns those, and the
 * vendor's TTL and attempt budget become the ones we enforce, so the UI never
 * promises a window the vendor will not honour.
 */
@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);
  private readonly provider: OtpProvider;
  private readonly secret: string;

  constructor(
    private readonly dbService: DbService,
    private readonly settings: PlatformSettingsService,
    config: ConfigService,
  ) {
    const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
    this.provider = resolveOtpProvider({
      providerId: config.get<string>('OTP_PROVIDER'),
      nodeEnv,
      diditApiKey: config.get<string>('DIDIT_API_KEY'),
    });
    // Reuse the share-link secret's guarantee (32+ bytes, not the Supabase JWT
    // secret) rather than inventing another env var before we need one. Hashing
    // is keyed so a stolen table alone can't be rainbow-tabled — codes are only
    // six digits, so an unkeyed hash would be trivially reversible.
    this.secret = config.get<string>('OTP_HASH_SECRET')
      ?? config.get<string>('SHARE_LINK_JWT_SECRET')
      ?? '';

    if (this.provider.id === 'unconfigured') {
      this.logger.warn(
        'Phone verification is INACTIVE — no OTP provider configured. ' +
          'POST /me/phone/start and /me/phone/confirm will return 503. ' +
          'Set OTP_PROVIDER=console for local testing, or OTP_PROVIDER=didit ' +
          'with DIDIT_API_KEY.',
      );
    } else if (!this.isEnabled) {
      this.logger.warn(
        `Phone verification is INACTIVE — provider '${this.provider.id}' needs a ` +
          'hashing secret (OTP_HASH_SECRET or SHARE_LINK_JWT_SECRET) and none is set.',
      );
    }
  }

  /**
   * Whether the feature can currently do anything. Surfaced on /me so the app
   * can hide the entry point rather than offer a flow that only 503s.
   *
   * The hashing secret is only load-bearing when WE own the code — a 'verifies'
   * provider needs no local secret, and requiring one would have made Didit
   * depend on an env var it never reads.
   */
  get isEnabled(): boolean {
    if (this.provider.id === 'unconfigured') return false;
    return this.provider.mode === 'verifies' || this.secret.length > 0;
  }

  /**
   * Configured AND switched on.
   *
   * `isEnabled` only says a provider is wired up. It can be wired up with no
   * credit, which is the state this whole switch exists for — so every entry
   * point asks this, not `isEnabled`.
   */
  async isLive(): Promise<boolean> {
    return this.isEnabled && (await this.settings.verificationVisible());
  }

  /** What the app should tell the user about how long they have. */
  get ttlMinutes(): number {
    return this.provider.ttlMinutes;
  }

  private hash(code: string, phone: string): string {
    // Bind the hash to the number as well as the code, so a row can't be
    // replayed against a different phone even if one leaked.
    return createHmac('sha256', this.secret).update(`${phone}:${code}`).digest('hex');
  }

  /** Cryptographically random 6-digit code, zero-padded. */
  private mintCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  /**
   * Turn a provider failure into the right HTTP answer for the right audience.
   *
   * The distinction that matters: an empty prepaid balance must not be reported
   * to the user as an invalid phone number. Only 'caller' blames the user.
   */
  private rethrow(err: unknown, phone: string): never {
    if (err instanceof OtpDeliveryError) {
      if (err.blame === 'caller') throw new BadRequestException(err.message);
      if (err.blame === 'rate') {
        throw new HttpException(
          'Too many codes requested just now. Please try again shortly.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      // 'config' adapters have already logged the detail loudly; 'provider' is
      // worth a line either way, since a run of them is an outage.
      this.logger.error(
        `OTP send failed for ${phone} (${err.blame}): ${err.message}` +
          (err.cause ? ` — ${String(err.cause)}` : ''),
      );
      throw new ServiceUnavailableException(
        'Could not send the code right now. Please try again shortly.',
      );
    }
    this.logger.error(`OTP send failed for ${phone}`, err as Error);
    throw new ServiceUnavailableException(
      'Could not send the code right now. Please try again shortly.',
    );
  }

  /**
   * Start a challenge: normalise, rate-limit, then either mint-and-send or ask
   * the vendor to do both.
   *
   * Returns only what the caller needs to render the next screen. Never returns
   * the code, and never reveals whether the number is already in use by another
   * account — that would turn this endpoint into an account-existence oracle.
   */
  async start(
    userId: string,
    rawPhone: string,
    opts: {
      locale?: 'en' | 'fr' | 'pt' | 'es' | 'sw' | 'ar';
      channel?: OtpChannel;
      defaultCountry?: CountryCode;
      signals?: OtpSignals;
    } = {},
  ): Promise<{ phone: string; channel: OtpChannel; expiresAt: Date; ttlMinutes: number }> {
    // Also refuses while the dashboard switch is off. An app build that still
    // has the old screens cached must not be able to drive a flow we are not
    // paying for, and the client is never the place that decision lives.
    if (!(await this.isLive())) {
      throw new ServiceUnavailableException(
        'Phone verification is not available on this server.',
      );
    }

    const phone = normalizePhone(rawPhone, opts.defaultCountry);
    if (!phone) {
      throw new BadRequestException('That does not look like a valid phone number.');
    }

    const db = this.dbService.db;
    const channel: OtpChannel = opts.channel ?? 'whatsapp';
    if (!this.provider.channels.includes(channel)) {
      throw new BadRequestException(`This server cannot send codes over ${channel}.`);
    }

    // Rate limit per NUMBER, not per user: one number being hammered from
    // several accounts is the abuse case that costs money and annoys whoever
    // owns the line.
    const since = new Date(Date.now() - SEND_WINDOW_MINUTES * 60_000);
    const [{ count } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(phoneVerifications)
      .where(
        and(eq(phoneVerifications.phone, phone), gte(phoneVerifications.createdAt, since)),
      );

    if (count >= MAX_SENDS_PER_WINDOW) {
      // Nest has no TooManyRequestsException — 429 has to be raised by hand.
      throw new HttpException(
        `Too many codes requested for that number. Try again in ${SEND_WINDOW_MINUTES} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // One live challenge per user (partial unique index backs this). Supersede
    // rather than reject, so a user who mistyped their number isn't stuck
    // waiting out a TTL on a number they can't receive on.
    await db
      .update(phoneVerifications)
      .set({ consumedAt: new Date() })
      .where(
        and(eq(phoneVerifications.userId, userId), isNull(phoneVerifications.consumedAt)),
      );

    const ttlMinutes = this.provider.ttlMinutes;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    if (this.provider.mode === 'verifies') {
      // Vendor first, row second. There is no secret to protect by writing the
      // row early, and the reverse order would leave a live challenge behind
      // whenever a send failed. If the insert is what fails, the user simply
      // gets a code they cannot use and asks for another.
      let providerRef: string | null = null;
      try {
        const started = await this.provider.start({
          toE164: phone,
          channel,
          locale: opts.locale ?? 'en',
          // Our own id for the attempt, so a support question can be traced in
          // their console. The user id, never an email or a name.
          vendorData: userId,
          signals: opts.signals,
        });
        providerRef = started.providerRef;
      } catch (err) {
        this.rethrow(err, phone);
      }

      await db.insert(phoneVerifications).values({
        userId,
        phone,
        // Null on purpose: the vendor owns the code. See the table's comment.
        codeHash: null,
        channel,
        expiresAt,
        providerId: this.provider.id,
        providerRef,
      });

      return { phone, channel, expiresAt, ttlMinutes };
    }

    // 'delivers': we own the code, so the row goes in before the send and is
    // burned if the send fails — a code the user never received must not stay
    // live.
    const code = this.mintCode();
    const [row] = await db
      .insert(phoneVerifications)
      .values({
        userId,
        phone,
        codeHash: this.hash(code, phone),
        channel,
        expiresAt,
        providerId: this.provider.id,
      })
      .returning({ id: phoneVerifications.id });

    try {
      const { providerMessageId } = await this.provider.send({
        toE164: phone,
        code,
        channel,
        locale: opts.locale ?? 'en',
        ttlMinutes,
      });
      if (providerMessageId && row) {
        await db
          .update(phoneVerifications)
          .set({ providerMessageId })
          .where(eq(phoneVerifications.id, row.id));
      }
    } catch (err) {
      if (row) {
        await db
          .update(phoneVerifications)
          .set({ consumedAt: new Date() })
          .where(eq(phoneVerifications.id, row.id));
      }
      this.rethrow(err, phone);
    }

    return { phone, channel, expiresAt, ttlMinutes };
  }

  /**
   * Confirm a code and, on success, commit the number to the user record.
   *
   * Every failure path returns the same generic message. Distinguishing
   * "expired" from "wrong" from "no such challenge" tells an attacker which
   * knob to turn; the UI's resend affordance covers the honest user's needs.
   */
  async confirm(
    userId: string,
    code: string,
  ): Promise<{ phone: string; verifiedAt: Date }> {
    // Also refuses while the dashboard switch is off. An app build that still
    // has the old screens cached must not be able to drive a flow we are not
    // paying for, and the client is never the place that decision lives.
    if (!(await this.isLive())) {
      throw new ServiceUnavailableException(
        'Phone verification is not available on this server.',
      );
    }

    const db = this.dbService.db;
    const invalid = () =>
      new BadRequestException('That code is not valid. Request a new one.');

    const [row] = await db
      .select()
      .from(phoneVerifications)
      .where(
        and(eq(phoneVerifications.userId, userId), isNull(phoneVerifications.consumedAt)),
      )
      .orderBy(desc(phoneVerifications.createdAt))
      .limit(1);

    if (!row) throw invalid();

    const burn = (risk?: OtpPhoneRisk | null) =>
      db
        .update(phoneVerifications)
        .set({ consumedAt: new Date(), ...(risk ? { risk } : {}) })
        .where(eq(phoneVerifications.id, row.id));

    // Our own expiry and attempt ceiling, checked first in both modes. For a
    // 'verifies' provider these mirror the vendor's own limits (see the
    // provider's ttlMinutes/maxAttempts), so we stop asking at the same moment
    // they stop accepting rather than sending a doomed request.
    if (row.expiresAt.getTime() < Date.now() || row.attempts >= this.provider.maxAttempts) {
      await burn();
      throw invalid();
    }

    // Count the attempt BEFORE checking, so a crash mid-check can't be used to
    // get free guesses.
    await db
      .update(phoneVerifications)
      .set({ attempts: row.attempts + 1 })
      .where(eq(phoneVerifications.id, row.id));

    const verifiedAt = new Date();

    if (this.provider.mode === 'verifies') {
      let result;
      try {
        result = await this.provider.check({ toE164: row.phone, code: code.trim() });
      } catch (err) {
        if (err instanceof OtpDeliveryError && err.blame === 'provider') {
          // Their 5xx is documented as not consuming an attempt on their side,
          // so it must not consume one here either — give the guess back.
          await db
            .update(phoneVerifications)
            .set({ attempts: row.attempts })
            .where(eq(phoneVerifications.id, row.id));
        }
        this.rethrow(err, row.phone);
      }

      // Anything short of an explicit approval is a failure. A declined
      // challenge is dead; a wrong code leaves the remaining guesses alone.
      if (result.outcome !== 'approved') {
        if (result.outcome !== 'wrong_code') await burn(result.risk);
        else if (result.risk) {
          await db
            .update(phoneVerifications)
            .set({ risk: result.risk })
            .where(eq(phoneVerifications.id, row.id));
        }
        if (result.outcome === 'declined') {
          this.logger.warn(
            `Provider declined ${row.phone}: ${result.detail ?? 'no detail'}` +
              (result.risk?.warnings.length ? ` [${result.risk.warnings.join(', ')}]` : ''),
          );
        }
        throw invalid();
      }

      await db
        .update(phoneVerifications)
        .set({ consumedAt: verifiedAt, risk: result.risk })
        .where(eq(phoneVerifications.id, row.id));
      await this.commit(userId, row.phone, verifiedAt);
      return { phone: row.phone, verifiedAt };
    }

    // 'delivers': the comparison is ours. Constant-time, against a hash bound
    // to this number.
    if (!row.codeHash) {
      // A row with no hash from a provider that should have made one. Refuse
      // rather than guess: this is the invariant the table's comment describes.
      this.logger.error(`Challenge ${row.id} has no code hash under a 'delivers' provider.`);
      await burn();
      throw invalid();
    }
    const expected = Buffer.from(row.codeHash, 'hex');
    const actual = Buffer.from(this.hash(code.trim(), row.phone), 'hex');
    const ok = expected.length === actual.length && timingSafeEqual(expected, actual);
    if (!ok) throw invalid();

    await burn();
    await this.commit(userId, row.phone, verifiedAt);
    return { phone: row.phone, verifiedAt };
  }

  /** The verify-then-write commit, shared by both modes. */
  private async commit(userId: string, phone: string, at: Date): Promise<void> {
    await this.dbService.db
      .update(users)
      .set({ phone, phoneVerifiedAt: at, updatedAt: at })
      .where(eq(users.id, userId));
  }

  /** Current verification state, for /me and the settings screen. */
  async status(
    userId: string,
  ): Promise<{ phone: string | null; verified: boolean; enabled: boolean }> {
    const [row] = await this.dbService.db
      .select({ phone: users.phone, verifiedAt: users.phoneVerifiedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return {
      phone: row?.phone ?? null,
      verified: Boolean(row?.verifiedAt),
      // The app hides its whole Verification section on this flag, so it has
      // to mean "offer this to people", not merely "a provider exists".
      enabled: await this.isLive(),
    };
  }
}
