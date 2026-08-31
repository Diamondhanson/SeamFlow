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
import { phoneVerifications, users } from '../db/schema';
import {
  OtpDeliveryError,
  resolveOtpProvider,
  type OtpChannel,
  type OtpDeliveryProvider,
} from './otp-provider';

/** How long a code stays valid. Long enough for WhatsApp to actually arrive. */
const TTL_MINUTES = 10;
/** Wrong guesses allowed before the challenge is burned. */
const MAX_ATTEMPTS = 5;
/** Sends allowed to one number per window — each one costs money. */
const MAX_SENDS_PER_WINDOW = 3;
const SEND_WINDOW_MINUTES = 60;

/**
 * Phone verification via a one-time code.
 *
 * This service owns EVERYTHING security-relevant — code generation, hashing,
 * expiry, attempt counting, rate limiting, and the final commit to
 * `users.phone`. Providers only deliver a string. That split is deliberate: it
 * means choosing (or changing) a WhatsApp vendor cannot introduce a weakness
 * here, and two adapters can never disagree about how strict the rules are.
 *
 * The commit is verify-then-write: `users.phone` is only updated after a
 * challenge against the new number succeeds, so a typo or a hostile number can
 * never displace one that already works.
 */
@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);
  private readonly provider: OtpDeliveryProvider;
  private readonly secret: string;

  constructor(
    private readonly dbService: DbService,
    config: ConfigService,
  ) {
    const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
    this.provider = resolveOtpProvider(config.get<string>('OTP_PROVIDER'), nodeEnv);
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
          'Set OTP_PROVIDER=console for local testing.',
      );
    }
  }

  /** Whether the feature can currently do anything. Surfaced on /me. */
  get isEnabled(): boolean {
    return this.provider.id !== 'unconfigured' && this.secret.length > 0;
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
   * Start a challenge: normalise, rate-limit, mint, store, send.
   *
   * Returns only what the caller needs to render the next screen. Never returns
   * the code, and never reveals whether the number is already in use by another
   * account — that would turn this endpoint into an account-existence oracle.
   */
  async start(
    userId: string,
    rawPhone: string,
    opts: {
      locale?: 'en' | 'fr' | 'pt' | 'es' | 'sw';
      channel?: OtpChannel;
      defaultCountry?: CountryCode;
    } = {},
  ): Promise<{ phone: string; channel: OtpChannel; expiresAt: Date; ttlMinutes: number }> {
    if (!this.isEnabled) {
      throw new ServiceUnavailableException(
        'Phone verification is not configured on this server.',
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

    const code = this.mintCode();
    const expiresAt = new Date(Date.now() + TTL_MINUTES * 60_000);

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
        ttlMinutes: TTL_MINUTES,
      });
      if (providerMessageId && row) {
        await db
          .update(phoneVerifications)
          .set({ providerMessageId })
          .where(eq(phoneVerifications.id, row.id));
      }
    } catch (err) {
      // Burn the challenge — a code the user never received must not stay live.
      if (row) {
        await db
          .update(phoneVerifications)
          .set({ consumedAt: new Date() })
          .where(eq(phoneVerifications.id, row.id));
      }
      if (err instanceof OtpDeliveryError && !err.retryable) {
        throw new BadRequestException(err.message);
      }
      this.logger.error(`OTP send failed for ${phone}`, err as Error);
      throw new ServiceUnavailableException(
        'Could not send the code right now. Please try again shortly.',
      );
    }

    return { phone, channel, expiresAt, ttlMinutes: TTL_MINUTES };
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
    if (!this.isEnabled) {
      throw new ServiceUnavailableException(
        'Phone verification is not configured on this server.',
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

    if (row.expiresAt.getTime() < Date.now() || row.attempts >= MAX_ATTEMPTS) {
      await db
        .update(phoneVerifications)
        .set({ consumedAt: new Date() })
        .where(eq(phoneVerifications.id, row.id));
      throw invalid();
    }

    // Count the attempt BEFORE comparing, so a crash mid-compare can't be used
    // to get free guesses.
    await db
      .update(phoneVerifications)
      .set({ attempts: row.attempts + 1 })
      .where(eq(phoneVerifications.id, row.id));

    const expected = Buffer.from(row.codeHash, 'hex');
    const actual = Buffer.from(this.hash(code.trim(), row.phone), 'hex');
    const ok = expected.length === actual.length && timingSafeEqual(expected, actual);
    if (!ok) throw invalid();

    const verifiedAt = new Date();
    await db
      .update(phoneVerifications)
      .set({ consumedAt: verifiedAt })
      .where(eq(phoneVerifications.id, row.id));
    await db
      .update(users)
      .set({ phone: row.phone, phoneVerifiedAt: verifiedAt, updatedAt: verifiedAt })
      .where(eq(users.id, userId));

    return { phone: row.phone, verifiedAt };
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
      enabled: this.isEnabled,
    };
  }
}
