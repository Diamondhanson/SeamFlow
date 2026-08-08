import { Injectable, Logger } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { deviceTokens, notificationSettings, notifications } from '../db/schema';
import type {
  DevicePlatform,
  NotificationEntityType,
  NotificationType,
} from '@seamflow/schemas';

// ============================================================================
// Expo push protocol primer
//
// Expo's push API accepts an array of up to 100 "messages" at once. Each
// message has at least `to` (a token string) and a body. The response is
// `{ data: [{ status: 'ok' | 'error', id?, message?, details? }] }`,
// indexed positionally with the input.
//
// Errors we have to handle automatically:
//   - DeviceNotRegistered → the token is dead; delete the row so we don't
//     keep paying the round-trip for it.
//   - InvalidCredentials  → our key/auth is broken; log loudly. Don't delete.
//   - MessageTooBig       → the payload exceeded 4 KiB; truncated, log.
//   - everything else     → log + leave token in place (transient).
//
// We don't await delivery (Expo only confirms the push was queued). The full
// receipts API exists for delivery confirmation but we don't need it for
// MVP — if a tailor never receives the notification, they'll tell us.
// ============================================================================

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_LIMIT = 100;

export interface PushPayload {
  title: string;
  body: string;
  /** App-defined deep-link data. Passed to the JS handler when the user taps. */
  data?: Record<string, unknown>;
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  // Optional but useful: lets the OS coalesce duplicates by id (e.g.
  // multiple "Status changed" on the same order shouldn't stack).
  // We don't set it by default because over-coalescing is worse than
  // duplicates for ops visibility.
  sound?: 'default' | null;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly dbService: DbService) {}

  /**
   * Register or refresh an Expo push token for a user. Idempotent — same
   * (user_id, expo_token) just bumps last_seen_at.
   */
  async registerToken(
    userId: string,
    expoToken: string,
    platform: DevicePlatform,
  ): Promise<void> {
    await this.dbService.db
      .insert(deviceTokens)
      .values({ userId, expoToken, platform })
      .onConflictDoUpdate({
        target: [deviceTokens.userId, deviceTokens.expoToken],
        set: { lastSeenAt: new Date(), platform },
      });
  }

  /** Remove a token (called from the mobile sign-out flow). */
  async removeToken(userId: string, expoToken: string): Promise<void> {
    await this.dbService.db
      .delete(deviceTokens)
      .where(
        and(eq(deviceTokens.userId, userId), eq(deviceTokens.expoToken, expoToken)),
      );
  }

  /**
   * Fan-out a push to every device registered for this user. Non-blocking —
   * callers should *not* await the network round-trip on the request hot
   * path. Errors are logged, not thrown. Returns the number of tokens we
   * attempted to send to.
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    const rows = await this.dbService.db
      .select({ expoToken: deviceTokens.expoToken })
      .from(deviceTokens)
      .where(eq(deviceTokens.userId, userId));

    if (rows.length === 0) {
      this.logger.debug(`No device tokens for user ${userId}; skipping push.`);
      return 0;
    }

    const tokens = rows.map((r) => r.expoToken);
    // Fire each batch in parallel — the Expo endpoint is fast and we're
    // already off the request hot path (caller didn't await us).
    await Promise.all(
      chunk(tokens, EXPO_BATCH_LIMIT).map((batch) => this.sendBatch(batch, payload)),
    );
    return tokens.length;
  }

  /** Send a fire-and-forget push. Used by hot-path callers (order transitions). */
  fireAndForget(userId: string, payload: PushPayload): void {
    this.sendToUser(userId, payload).catch((err) => {
      this.logger.warn(
        `Push fan-out to user ${userId} failed: ${(err as Error).message}`,
      );
    });
  }

  // ── The choke point ────────────────────────────────────────────────────────

  /**
   * Emit a notification: record it in the inbox and/or push it to devices.
   *
   * FEATURE CODE SHOULD CALL THIS, not sendToUser/fireAndForget directly.
   * Having one entry point is what stops the two halves drifting apart — it is
   * otherwise very easy to ship a push that leaves no record (so a missed
   * notification is gone forever), or write an inbox row that never reaches
   * anyone. Mutes are checked here too, in one place.
   *
   * The two flags are independent on purpose:
   *
   *   persist + push   the default for consequential events
   *   push only        chat messages (the thread is already the record) and
   *                    due/overdue nudges (a STATE, already on the orders list)
   *   persist only     low-value items worth listing but not worth buzzing for
   *
   * Never awaits delivery. A push failure must not fail the request that caused
   * it — the inbox row is already durable by then.
   */
  async emit(
    userId: string,
    input: {
      type: NotificationType;
      /** Interpolation values. Include a display snapshot (e.g. order name). */
      params?: Record<string, string | number>;
      entity?: { type: NotificationEntityType; id: string } | null;
      /**
       * Rendered push copy, or null for inbox-only.
       *
       * Rendered by the CALLER because only it knows the recipient's language
       * (see reminders.service's `reminderMessage`). The inbox row stores
       * `type` + `params` instead and renders in-app, so history follows the
       * reader's language rather than whatever we picked at write time.
       */
      push?: PushPayload | null;
      persist?: boolean;
    },
  ): Promise<void> {
    const { type, params = {}, entity = null, push = null, persist = true } = input;

    try {
      if (await this.isMuted(userId, type)) return;

      if (persist) {
        await this.dbService.db.insert(notifications).values({
          userId,
          type,
          params,
          entityType: entity?.type ?? null,
          entityId: entity?.id ?? null,
        });
      }

      if (push) this.fireAndForget(userId, push);
    } catch (err) {
      // A notification is never the point of the request that triggered it.
      this.logger.warn(`emit(${type}) for user ${userId} failed: ${String(err)}`);
    }
  }

  /**
   * Mutes are opt-OUT, so a user with no settings row receives everything and
   * a newly added type ships live without a backfill.
   */
  private async isMuted(userId: string, type: NotificationType): Promise<boolean> {
    const [row] = await this.dbService.db
      .select({ mutedTypes: notificationSettings.mutedTypes })
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId))
      .limit(1);
    return row?.mutedTypes?.includes(type) ?? false;
  }

  private async sendBatch(tokens: string[], payload: PushPayload): Promise<void> {
    const messages: ExpoMessage[] = tokens.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
    }));

    let body: { data?: ExpoTicket[]; errors?: unknown };
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          // Expo accepts gzipped requests; not enabled here to keep this
          // simple. Payloads are tiny.
        },
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        this.logger.error(
          `Expo push HTTP ${res.status}: ${await res.text().catch(() => '<no body>')}`,
        );
        return;
      }
      body = (await res.json()) as { data?: ExpoTicket[] };
    } catch (err) {
      this.logger.error(`Expo push fetch failed: ${(err as Error).message}`);
      return;
    }

    const tickets = body.data ?? [];
    const deadTokens: string[] = [];
    tickets.forEach((t, i) => {
      const token = tokens[i];
      if (!token) return;
      if (t.status === 'ok') return;
      // status === 'error'
      const code = t.details?.error;
      if (code === 'DeviceNotRegistered') {
        deadTokens.push(token);
      } else if (code === 'InvalidCredentials') {
        this.logger.error(
          'Expo push reports InvalidCredentials — check FCM/APNs setup',
        );
      } else {
        this.logger.warn(`Expo push error for token: ${t.message} (${code ?? 'unknown'})`);
      }
    });

    if (deadTokens.length > 0) {
      await this.dbService.db
        .delete(deviceTokens)
        .where(inArray(deviceTokens.expoToken, deadTokens));
      this.logger.log(`Pruned ${deadTokens.length} stale push tokens`);
    }
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) throw new Error('chunk size must be positive');
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
