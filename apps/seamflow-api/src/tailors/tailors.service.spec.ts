// The actual tailor/client boundary.
//
// The API registers a RolesGuard, but `@Roles()` is on none of its routes, so
// nothing is role-checked at the route level. What keeps a client account out
// of a tailor's data is this: every tailor-scoped handler calls
// `requireTailorId`, and every query below it filters on what it returns.
//
// That makes this function load-bearing for the whole product, and it is three
// lines long with no test. Hence these.

import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TailorsService } from './tailors.service';
import { fakeDbQueue } from '../../test/fakes';

function service(queue: unknown[][]) {
  const db = fakeDbQueue(queue);
  return { svc: new TailorsService(db.service as never), db };
}

describe('TailorsService.requireTailorId', () => {
  it('returns the tailor id for an account that owns a shop', async () => {
    const { svc } = service([[{ id: 'tailor-1', userId: 'user-1' }]]);
    await expect(svc.requireTailorId('user-1')).resolves.toBe('tailor-1');
  });

  it('refuses an account with no shop — this is the client/tailor boundary', async () => {
    // A client-role account calling a tailor endpoint lands here. It must not
    // fall through to a handler with an undefined tailorId, because every
    // query below filters on that value.
    const { svc } = service([[]]);
    await expect(svc.requireTailorId('client-user')).rejects.toThrow(NotFoundException);
  });

  it('looks the shop up by the authenticated user id, never by anything passed in', async () => {
    // The guarantee that makes the per-row boundary work: the only input is
    // the id the auth guard verified.
    const { svc } = service([[{ id: 'tailor-1', userId: 'user-1' }]]);
    await expect(svc.requireTailorId('user-1')).resolves.toBe('tailor-1');
    expect(TailorsService.prototype.requireTailorId.length).toBe(1);
  });
});

describe('TailorsService.getForUser', () => {
  it('returns null rather than throwing, so /me can report "no shop yet"', async () => {
    const { svc } = service([[]]);
    await expect(svc.getForUser('user-1')).resolves.toBeNull();
  });
});
