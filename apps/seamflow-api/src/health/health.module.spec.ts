// The dev hooks must not exist in production.
//
// There are nine of them and they are all @Public(): they purge accounts,
// grant paid subscriptions, record payments and run retention sweeps. They
// used to each carry their own `if (NODE_ENV === 'production') throw`, which
// held — but it failed open, because `envSchema` defaults NODE_ENV to
// 'development'. An unset Render variable would have opened all nine.
//
// The gate is now registration, so this test reads the module's own metadata
// rather than calling a handler: the question is whether the route EXISTS.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { MODULE_METADATA } from '@nestjs/common/constants';

/**
 * Import HealthModule fresh with NODE_ENV set to `env`. The module decides at
 * import time, so the registry has to be reset between cases.
 */
async function controllersWhenNodeEnvIs(env: string | undefined): Promise<string[]> {
  const previous = process.env.NODE_ENV;
  if (env === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = env;
  vi.resetModules();
  try {
    const mod = await import('./health.module');
    const controllers: unknown[] =
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, mod.HealthModule) ?? [];
    return controllers.map((c) => (c as { name: string }).name);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
}

afterEach(() => {
  vi.resetModules();
});

describe('HealthModule registration', () => {
  it('does not register the dev hooks in production', async () => {
    const names = await controllersWhenNodeEnvIs('production');
    expect(names).toContain('HealthController');
    expect(names).not.toContain('DevHooksController');
  });

  it('registers them in development, where the tests need them', async () => {
    const names = await controllersWhenNodeEnvIs('development');
    expect(names).toContain('DevHooksController');
  });

  it('keeps the real health check in every environment', async () => {
    // Render polls /health; it must never be the thing that fails a deploy.
    for (const env of ['production', 'development', 'test', undefined]) {
      expect(await controllersWhenNodeEnvIs(env)).toContain('HealthController');
    }
  });
});

describe('the dev hooks themselves', () => {
  it('no longer rely on a per-handler NODE_ENV check', async () => {
    // Registration is now the only gate, so this asserts the handlers do not
    // ALSO carry the old inline guard. Reintroducing it would not be unsafe —
    // but it would mean the gate being trusted had quietly moved, and this
    // suite would keep passing for the weaker reason.
    const { existsSync, readFileSync } = await import('node:fs');
    const path = 'src/health/dev-hooks.controller.ts';
    // Relative to the package root, which is where vitest runs. Asserted so a
    // moved file fails the test instead of vacuously satisfying it.
    expect(existsSync(path), `${path} not found from ${process.cwd()}`).toBe(true);
    const code = readFileSync(path, 'utf8')
      .replace(/\/\*\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/process\.env\.NODE_ENV/);
  });
});
