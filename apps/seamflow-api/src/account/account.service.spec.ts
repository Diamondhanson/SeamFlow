// Cancelling a deletion, and the window in which it used to destroy an account.
//
// The purge runs in steps: the tailors row and everything cascading from it go
// at step 2, the `deleted_at` tombstone is written at step 4, and credentials
// survive to step 5 — so there is a stretch where the data is gone, the account
// can still be signed into, and `deleted_at` is still null. Cancel used to test
// only `deleted_at`, so inside that stretch it SUCCEEDED and handed back an
// ordinary-looking empty account with no record a deletion had ever run.

import { describe, expect, it } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { AccountService } from './account.service';
import { fakeDbQueue } from '../../test/fakes';

const DAY = 24 * 60 * 60 * 1000;

function service(queue: unknown[][]) {
  const db = fakeDbQueue(queue);
  return {
    svc: new AccountService(db.service as never, {} as never),
    db,
  };
}

/** What getState reads back — it aliases the columns to these names. */
function stateRow(over: { requestedAt?: Date | null; scheduledFor?: Date | null } = {}) {
  return [
    {
      requestedAt: new Date(Date.now() - DAY),
      scheduledFor: new Date(Date.now() + 29 * DAY),
      ...over,
    },
  ];
}

describe('AccountService.cancelDeletion', () => {
  it('cancels while the grace period is still running', async () => {
    // The update matches, then getState reads the cleared row back.
    const { svc, db } = service([[{ id: 'user-1' }], stateRow({ requestedAt: null, scheduledFor: null })]);
    await expect(svc.cancelDeletion('user-1')).resolves.toMatchObject({ requestedAt: null });
    expect(db.calls).toContain('update');
  });

  it('refuses once the deadline has passed, instead of reporting success', async () => {
    // The guarded update matches nothing; the row still says a deletion is
    // pending. This is the case that used to wipe an account silently.
    const { svc } = service([[], stateRow({ scheduledFor: new Date(Date.now() - DAY) })]);
    await expect(svc.cancelDeletion('user-1')).rejects.toThrow(ConflictException);
  });

  it('says why it refused, so the app can explain it', async () => {
    const { svc } = service([[], stateRow({ scheduledFor: new Date(Date.now() - DAY) })]);
    await svc.cancelDeletion('user-1').then(
      () => expect.unreachable('should have thrown'),
      (err: ConflictException) => {
        expect(err.getResponse()).toMatchObject({ error: 'deletion_already_due' });
      },
    );
  });

  it('is a harmless no-op when nothing was pending', async () => {
    // A double-tap on Cancel must not become an error.
    const { svc } = service([[], stateRow({ requestedAt: null, scheduledFor: null })]);
    await expect(svc.cancelDeletion('user-1')).resolves.toMatchObject({ requestedAt: null });
  });
});
