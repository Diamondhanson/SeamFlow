// Approving a verification. The badge and the decision have to land together.
//
// "The badge and its provenance move together" was the comment; nothing
// enforced it. The request was marked approved first and the badge applied
// second, so a failure in between left a request reading 'approved' with no
// badge on the shop — and decide() refuses any request that is not pending, so
// staff could not re-approve it. Unsticking it took a hand edit of the database,
// and nothing surfaced that it needed one.

import { describe, expect, it, vi } from 'vitest';
import { VerificationService } from './verification.service';
import { fakeTxDb } from '../../test/fakes';

const PENDING_REQUEST = {
  id: 'req-1',
  tailorId: 'tailor-1',
  status: 'pending',
  evidence: [],
  createdAt: new Date('2026-10-01'),
  updatedAt: new Date('2026-10-01'),
};

function build(failOnWrite?: number) {
  const db = fakeTxDb({
    queue: [
      [PENDING_REQUEST], // the existing-request lookup
      [{ ...PENDING_REQUEST, status: 'approved' }], // the request update's RETURNING
      [], // the tailors update
    ],
    failOnWrite,
  });
  const notifications = { emit: vi.fn(async () => {}) };
  const svc = new VerificationService(
    db.service as never,
    notifications as never,
    {} as never,
    {} as never,
  );
  // toRequest and notifyDecision are not what is under test here.
  vi.spyOn(svc as never as { toRequest: (r: unknown) => unknown }, 'toRequest').mockImplementation(
    (r) => r,
  );
  vi.spyOn(
    svc as never as { notifyDecision: (...a: unknown[]) => Promise<void> },
    'notifyDecision',
  ).mockResolvedValue(undefined);
  return { svc, db };
}

describe('VerificationService.decide', () => {
  it('records the decision and grants the badge together', async () => {
    const { svc, db } = build();
    await expect(svc.decide('staff-1', 'req-1', true, 'looks right')).resolves.toBeTruthy();
    expect(db.committed.filter((w) => w === 'update')).toHaveLength(2);
    expect(db.rolledBack).toBe(false);
  });

  it('leaves the request pending when the badge cannot be granted', async () => {
    // Write 1 is the request, write 2 the badge. If the badge fails, the
    // request must NOT stay approved — otherwise decide() will refuse to try
    // again and only a database edit can fix it.
    const { svc, db } = build(2);
    await expect(svc.decide('staff-1', 'req-1', true, 'looks right')).rejects.toThrow();
    expect(db.rolledBack).toBe(true);
    expect(db.committed).not.toContain('update');
  });

  it('still refuses a decline with no reason', async () => {
    // Pre-existing rule, pinned: the tailor is shown the reason verbatim, so
    // there has to be one.
    const { svc } = build();
    await expect(svc.decide('staff-1', 'req-1', false, '   ')).rejects.toThrow(/reason/i);
  });

  it('still refuses to decide a request twice', async () => {
    const db = fakeTxDb({ queue: [[{ ...PENDING_REQUEST, status: 'approved' }]] });
    const svc = new VerificationService(db.service as never, {} as never, {} as never, {} as never);
    await expect(svc.decide('staff-1', 'req-1', true, null)).rejects.toThrow(/already/i);
  });
});
