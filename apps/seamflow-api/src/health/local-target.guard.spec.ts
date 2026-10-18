// The guard that exists because POST /health/run-purge was called against
// production during a routine endpoint check on 2026-10-18. It deleted nothing
// only because no account was past its grace period that day.

import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { DESTRUCTIVE_OPT_IN, LocalTargetGuard } from './local-target.guard';

function guard(env: Record<string, string | undefined>) {
  return new LocalTargetGuard({ get: (k: string) => env[k] } as never);
}

const PROD = 'https://aqsppiyiegzatnjvjgyp.supabase.co';

describe('LocalTargetGuard', () => {
  it('refuses a remote project', async () => {
    // The exact situation that happened: NODE_ENV=development, production
    // credentials, and a destructive hook one curl away.
    expect(() => guard({ SUPABASE_URL: PROD }).canActivate()).toThrow(ForbiddenException);
  });

  it('names the project it would have acted on', () => {
    try {
      guard({ SUPABASE_URL: PROD }).canActivate();
      expect.unreachable('should have thrown');
    } catch (err) {
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        error: 'remote_project',
        project: 'aqsppiyiegzatnjvjgyp.supabase.co',
      });
    }
  });

  it.each([
    'http://localhost:54321',
    'http://127.0.0.1:54321',
    'http://10.0.2.2:54321',
    'http://db.localhost:54321',
  ])('allows %s without any opt-in', (url) => {
    // The normal development loop has to stay frictionless, or it gets
    // worked around.
    expect(guard({ SUPABASE_URL: url }).canActivate()).toBe(true);
  });

  it('allows a remote project when the opt-in says so in words', () => {
    expect(
      guard({ SUPABASE_URL: PROD, DEV_DESTRUCTIVE_HOOKS: DESTRUCTIVE_OPT_IN }).canActivate(),
    ).toBe(true);
  });

  it('is not satisfied by a casually truthy value', () => {
    // The whole reason the opt-in is a phrase: `=true` is the kind of thing
    // that ends up in a shell profile or a CI matrix by accident.
    for (const v of ['true', '1', 'yes', 'TRUE', '']) {
      expect(() =>
        guard({ SUPABASE_URL: PROD, DEV_DESTRUCTIVE_HOOKS: v }).canActivate(),
      ).toThrow(ForbiddenException);
    }
  });

  it('refuses when SUPABASE_URL is missing or unparseable', () => {
    // Fail closed: an unreadable target is not a local one.
    expect(() => guard({}).canActivate()).toThrow(ForbiddenException);
    expect(() => guard({ SUPABASE_URL: 'not-a-url' }).canActivate()).toThrow(ForbiddenException);
  });
});
