// Liveness and readiness are deliberately different answers.
//
// /health always returns 200 because Render polls it and a restart loop is not
// the right response to a Supabase outage. The cost was that nothing ever
// returned a failing status code, so an uptime check saw a healthy 200 with
// "db":"down" in the body. /health/ready is the one a pager can point at.

import { describe, expect, it } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

function controller(opts: { configured?: boolean; up?: boolean }) {
  const db = {
    isConfigured: () => opts.configured ?? true,
    ping: async () => opts.up ?? true,
  };
  const queue = { isConfigured: () => false, ping: async () => false };
  return new HealthController(db as never, queue as never);
}

describe('GET /health — liveness', () => {
  it('answers ok even when the database is down', async () => {
    // Deliberate. Render must not restart the service over a database outage.
    const res = await controller({ up: false }).check();
    expect(res.ok).toBe(true);
    expect(res.db).toBe('down');
  });

  it('still reports the real state in the body', async () => {
    expect((await controller({ up: true }).check()).db).toBe('up');
    expect((await controller({ configured: false }).check()).db).toBe('not_configured');
  });
});

describe('GET /health/ready — readiness', () => {
  it('answers ready when the database is reachable', async () => {
    await expect(controller({ up: true }).ready()).resolves.toEqual({ ready: true, db: 'up' });
  });

  it('FAILS with 503 when the database is down', async () => {
    // The whole point: a status code an uptime check can act on.
    await expect(controller({ up: false }).ready()).rejects.toThrow(ServiceUnavailableException);
  });

  it('fails when there is no database configured at all', async () => {
    await expect(controller({ configured: false }).ready()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('says which part is unhappy, so the alert is actionable', async () => {
    await controller({ up: false })
      .ready()
      .then(
        () => expect.unreachable('should have thrown'),
        (err: ServiceUnavailableException) => {
          expect(err.getResponse()).toMatchObject({ ready: false, db: 'down' });
        },
      );
  });
});
