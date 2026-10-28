import {
  CanActivate,
  ForbiddenException,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { SupabaseService } from '../supabase/supabase.service';
import { DbService } from '../db/db.service';
import { users } from '../db/schema';

type UserRow = typeof users.$inferSelect;
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { ALLOW_SUSPENDED_KEY } from './decorators/allow-suspended.decorator';
import type { AuthedRequest, ProfileRow } from './auth.types';
import type { UserRole } from '@seamflow/types';

/**
 * Validates the `Authorization: Bearer <jwt>` header against Supabase Auth
 * and enriches the request with the matching public.users profile.
 *
 * Routes marked @Public() bypass this guard entirely.
 *
 * COST. This runs before every authenticated handler, and it needs two things:
 * Supabase's verdict on the token (an HTTPS call) and the caller's `users` row
 * (a database read). The API runs in Oregon and both of those live in
 * eu-west-1, so each is a transatlantic round trip of roughly 150 ms. Done one
 * after the other, that was ~300 ms before any handler started.
 *
 * They are now issued TOGETHER. The row cannot be looked up without a user id,
 * and the id only becomes trustworthy once Supabase answers — so the id is read
 * out of the token's payload WITHOUT verifying it, purely to start the query
 * early, and the result is thrown away unless it matches the id Supabase
 * returns. An attacker who edits the `sub` in an unsigned payload changes
 * nothing: the token still fails verification, and a mismatched prefetch is
 * discarded and re-read. The speculative id never reaches an authorization
 * decision.
 *
 * NOT DONE, deliberately: verifying the signature locally against the project
 * JWKS (it publishes an ES256 key, so no secret would be needed) would remove
 * the HTTPS call altogether. It would also mean a signed-out token keeps
 * working until it expires, because nothing would consult the session any
 * more — and `AccountService.dropSessions` revokes sessions on purpose when an
 * account asks to be deleted. That is a security property to give up on
 * purpose, not as a side effect of a latency fix.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
    private readonly db: DbService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const jwt = header.slice(7).trim();
    if (!jwt) {
      throw new UnauthorizedException('Empty bearer token');
    }

    // Start both round trips at once. `hintedUserId` is read from the token
    // without verifying anything, so it is untrusted input used for one thing
    // only: giving the database query a head start.
    const hintedUserId = unverifiedSubject(jwt);
    const [verdict, prefetched] = await Promise.all([
      this.supabase.admin().auth.getUser(jwt),
      hintedUserId ? this.loadUserRow(hintedUserId) : Promise.resolve(null),
    ]);

    const { data, error } = verdict;
    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // The prefetch counts only if it is the user Supabase just vouched for.
    // Anything else — a tampered payload, a token whose payload we could not
    // read — falls back to a real lookup.
    const row =
      prefetched && prefetched.id === data.user.id
        ? prefetched
        : await this.loadUserRow(data.user.id);

    // Heal a missing display name from what the sign-in provider told us. The
    // database copies the name onto the profile when the account is created, but
    // only if it was known THEN — Apple, for one, hands over a name once, after
    // the account exists. Without this such accounts stayed nameless and showed
    // up as "Client" in every designer's conversation list. Fire-and-forget: it
    // must never slow or fail a request.
    if (row && !row.fullName?.trim()) {
      const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      const name = [meta.full_name, meta.name].find(
        (v): v is string => typeof v === 'string' && v.trim().length > 0,
      );
      if (name) {
        row.fullName = name.trim().slice(0, 80);
        void this.db.db
          .update(users)
          .set({ fullName: row.fullName })
          .where(eq(users.id, row.id))
          .catch((err: unknown) => this.logger.warn(`Name heal failed: ${String(err)}`));
      }
    }

    let profile: ProfileRow | null = null;
    let suspendedAt: Date | null = null;
    let suspensionReason: string | null = null;
    if (row) {
      suspendedAt = row.suspendedAt ?? null;
      suspensionReason = row.suspensionReason ?? null;
      profile = {
        id: row.id,
        phone: row.phone,
        email: row.email,
        role: row.role as UserRole,
        fullName: row.fullName,
        subscriptionEmailsOptIn: row.subscriptionEmailsOptIn,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }

    req.user = {
      id: data.user.id,
      email: data.user.email ?? null,
      phone: data.user.phone ?? null,
      role: profile?.role ?? 'tailor',
      profile,
      jwt,
    };

    // A suspended account may READ everything it ever made, and may not change
    // anything. That asymmetry is the whole design: the rule that a tailor can
    // always open SeamFlow and see their own work holds even here. The profile
    // row was already fetched above, so this costs nothing.
    if (suspendedAt) {
      const method = (req.method ?? 'GET').toUpperCase();
      const writes = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
      const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_SUSPENDED_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
      if (writes && !allowed) {
        throw new ForbiddenException({
          error: 'account_suspended',
          reason: suspensionReason ?? null,
          since: suspendedAt.toISOString(),
        });
      }
    }
    return true;
  }

  /**
   * One `users` row, or null. A failure is logged and swallowed — see the
   * `it.todo` in the spec: whether this should instead fail closed is an open
   * question, because a database blip currently lets a caller through with the
   * default role and skips the suspension check.
   */
  private async loadUserRow(userId: string): Promise<UserRow | null> {
    if (!this.db.isConfigured()) return null;
    try {
      const rows = await this.db.db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return rows[0] ?? null;
    } catch (err) {
      this.logger.error('Profile lookup failed', err as Error);
      return null;
    }
  }
}

/**
 * The `sub` claim of a token NOBODY has verified yet.
 *
 * Used to prefetch a row in parallel with verification and for nothing else.
 * The caller must compare it against the verified id before trusting the
 * result — see the note on the guard.
 */
function unverifiedSubject(jwt: string): string | null {
  try {
    const payload = jwt.split('.')[1];
    if (!payload) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: unknown;
    };
    return typeof claims.sub === 'string' && claims.sub.length > 0 ? claims.sub : null;
  } catch {
    return null;
  }
}
