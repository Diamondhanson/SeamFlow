// The front door. Every authenticated request in the API passes through this
// guard, so each case below is either a way in that must stay shut or a rule
// the product depends on (a suspended tailor can still read their own work).

import { describe, expect, it } from 'vitest';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { ALLOW_SUSPENDED_KEY } from './decorators/allow-suspended.decorator';
import { fakeContext, fakeDb, fakeDbQueue, fakeReflector, fakeSupabase, jwtWithClaims } from '../../test/fakes';

const USER = { id: 'user-1', email: 'tailor@example.com', phone: null };

/** A users row as the guard reads it. */
function profileRow(over: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    phone: null,
    email: 'tailor@example.com',
    role: 'tailor',
    fullName: 'Ada',
    subscriptionEmailsOptIn: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    suspendedAt: null,
    suspensionReason: null,
    ...over,
  };
}

function build({
  metadata = {},
  supabase = fakeSupabase({ user: USER }),
  rows = [profileRow()],
}: {
  metadata?: Record<string, unknown>;
  supabase?: unknown;
  rows?: unknown[];
} = {}) {
  return new SupabaseAuthGuard(
    fakeReflector(metadata) as never,
    supabase as never,
    fakeDb(rows) as never,
  );
}

function request(over: Record<string, unknown> = {}) {
  return { headers: { authorization: 'Bearer good-token' }, method: 'GET', ...over };
}

describe('SupabaseAuthGuard', () => {
  describe('token handling', () => {
    it('accepts a valid bearer token', async () => {
      const req = request();
      await expect(build().canActivate(fakeContext(req))).resolves.toBe(true);
    });

    it('refuses a request with no Authorization header', async () => {
      const req = request({ headers: {} });
      await expect(build().canActivate(fakeContext(req))).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('refuses a header that is not a Bearer scheme', async () => {
      const req = request({ headers: { authorization: 'Basic dXNlcjpwYXNz' } });
      await expect(build().canActivate(fakeContext(req))).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('refuses "Bearer" with nothing after it', async () => {
      const req = request({ headers: { authorization: 'Bearer    ' } });
      await expect(build().canActivate(fakeContext(req))).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('refuses a token Supabase rejects', async () => {
      const guard = build({ supabase: fakeSupabase({ user: null, error: { message: 'bad jwt' } }) });
      await expect(guard.canActivate(fakeContext(request()))).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('@Public()', () => {
    it('lets a public route through with no token at all', async () => {
      const guard = build({ metadata: { [IS_PUBLIC_KEY]: true } });
      const req = request({ headers: {} });
      await expect(guard.canActivate(fakeContext(req))).resolves.toBe(true);
    });

    it('does not populate req.user on a public route', async () => {
      // Anything downstream that reads req.user on a public route must handle
      // undefined — the rate limiter keys those callers by IP for this reason.
      const guard = build({ metadata: { [IS_PUBLIC_KEY]: true } });
      const req = request({ headers: {} }) as Record<string, unknown>;
      await guard.canActivate(fakeContext(req));
      expect(req.user).toBeUndefined();
    });
  });

  describe('the request it hands to the handler', () => {
    it('carries the id, the profile and the raw jwt', async () => {
      const req = request() as Record<string, unknown>;
      await build().canActivate(fakeContext(req));
      expect(req.user).toMatchObject({
        id: 'user-1',
        email: 'tailor@example.com',
        role: 'tailor',
        jwt: 'good-token',
      });
    });

    it('takes the role from the users row, not from the token', async () => {
      const guard = build({ rows: [profileRow({ role: 'client' })] });
      const req = request() as Record<string, unknown>;
      await guard.canActivate(fakeContext(req));
      expect((req.user as { role: string }).role).toBe('client');
    });

    it('falls back to the least-privileged role when there is no profile row', async () => {
      // A brand-new auth user with no public.users row yet must not land on a
      // privileged default. 'tailor' is the floor; it must never become 'admin'.
      const guard = build({ rows: [] });
      const req = request() as Record<string, unknown>;
      await guard.canActivate(fakeContext(req));
      expect((req.user as { role: string }).role).toBe('tailor');
      expect((req.user as { profile: unknown }).profile).toBeNull();
    });
  });

  describe('suspended accounts', () => {
    const suspended = [
      profileRow({ suspendedAt: new Date('2026-09-01'), suspensionReason: 'spam' }),
    ];

    it('may still read everything they ever made', async () => {
      const guard = build({ rows: suspended });
      await expect(
        guard.canActivate(fakeContext(request({ method: 'GET' }))),
      ).resolves.toBe(true);
    });

    it.each(['POST', 'PATCH', 'PUT', 'DELETE'])('may not %s', async (method) => {
      const guard = build({ rows: suspended });
      await expect(
        guard.canActivate(fakeContext(request({ method }))),
      ).rejects.toThrow(ForbiddenException);
    });

    it('is told why and since when, so the app can say so', async () => {
      const guard = build({ rows: suspended });
      await guard
        .canActivate(fakeContext(request({ method: 'POST' })))
        .then(
          () => expect.unreachable('should have thrown'),
          (err: ForbiddenException) => {
            expect(err.getResponse()).toMatchObject({
              error: 'account_suspended',
              reason: 'spam',
              since: '2026-09-01T00:00:00.000Z',
            });
          },
        );
    });

    it('may still write to a route marked @AllowSuspended', async () => {
      // Support and account-deletion: a suspension nobody can appeal, and that
      // traps your data, is a ban with extra steps.
      const guard = build({
        metadata: { [ALLOW_SUSPENDED_KEY]: true },
        rows: suspended,
      });
      await expect(
        guard.canActivate(fakeContext(request({ method: 'POST' }))),
      ).resolves.toBe(true);
    });

    it('treats HEAD and OPTIONS as reads', async () => {
      const guard = build({ rows: suspended });
      for (const method of ['HEAD', 'OPTIONS']) {
        await expect(
          guard.canActivate(fakeContext(request({ method }))),
        ).resolves.toBe(true);
      }
    });
  });

  describe('the parallel prefetch', () => {
    // The users row is fetched at the same time as Supabase's verdict, using
    // the `sub` read out of the token WITHOUT verifying it. That is untrusted
    // input, so the only thing holding this safe is the comparison against the
    // id Supabase actually returns.

    function prefetchGuard(rows: unknown[][]) {
      const db = fakeDbQueue(rows);
      return {
        guard: new SupabaseAuthGuard(
          fakeReflector({}) as never,
          fakeSupabase({ user: USER }) as never,
          db.service as never,
        ),
        db,
      };
    }

    function requestWithSub(sub: string) {
      return {
        headers: { authorization: `Bearer ${jwtWithClaims({ sub })}` },
        method: 'GET',
      } as Record<string, unknown>;
    }

    it('uses the prefetched row when it is the verified user', async () => {
      // One query only: the head start paid off.
      const { guard, db } = prefetchGuard([[profileRow()]]);
      const req = requestWithSub('user-1');
      await guard.canActivate(fakeContext(req));
      expect((req.user as { profile: { id: string } }).profile.id).toBe('user-1');
      expect(db.left).toBe(0);
    });

    it('throws the prefetch away when the token claimed a different user', async () => {
      // A tampered `sub`. The token still fails nothing here — Supabase says
      // user-1 — but the row that came back is somebody else's and must not be
      // used. The guard re-reads, and the profile is user-1's.
      const victim = profileRow({ id: 'victim-9', fullName: 'Victim', role: 'admin' });
      const { guard } = prefetchGuard([[victim], [profileRow()]]);
      const req = requestWithSub('victim-9');
      await guard.canActivate(fakeContext(req));
      const user = req.user as { id: string; profile: { id: string }; role: string };
      expect(user.id).toBe('user-1');
      expect(user.profile.id).toBe('user-1');
      // The decisive one: no claim from the other row leaked through.
      expect(user.role).toBe('tailor');
    });

    it('still works when the token payload cannot be read at all', async () => {
      // No prefetch to be had; it falls back to a plain lookup.
      const { guard } = prefetchGuard([[profileRow()]]);
      const req = { headers: { authorization: 'Bearer not-a-jwt' }, method: 'GET' } as Record<
        string,
        unknown
      >;
      await expect(guard.canActivate(fakeContext(req))).resolves.toBe(true);
      expect((req.user as { profile: { id: string } }).profile.id).toBe('user-1');
    });

    it('does not let a tampered sub decide suspension', async () => {
      // The nastiest version: point the prefetch at an unsuspended account to
      // try to shake off your own suspension. The discard has to happen before
      // the suspension check reads anything.
      const clean = profileRow({ id: 'someone-else', suspendedAt: null });
      const suspended = profileRow({ suspendedAt: new Date('2026-09-01'), suspensionReason: 'spam' });
      const { guard } = prefetchGuard([[clean], [suspended]]);
      const req = {
        headers: { authorization: `Bearer ${jwtWithClaims({ sub: 'someone-else' })}` },
        method: 'POST',
      } as Record<string, unknown>;
      await expect(guard.canActivate(fakeContext(req))).rejects.toThrow(ForbiddenException);
    });
  });

  // ── Known gap, logged as P-6 in docs/qa-audit-plan.md ────────────────────
  // The profile lookup is wrapped in try/catch and only logged, so a database
  // blip lets the caller through with the default role AND skips the
  // suspension check entirely. Phase 1.1 decides whether that fails closed.
  it.todo('fails closed when the profile lookup errors (P-6)');
});
