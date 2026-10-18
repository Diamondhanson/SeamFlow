// A group order points at four things, and none of them was checked.
//
// `createWithMembers` verified the owner client before using it. The plain
// `create`/`update` pair verified nothing, so a group could cite another
// tailor's fabric, template, member row or client.

import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { GroupOrdersService } from './group-orders.service';
import { fakeDbQueue } from '../../test/fakes';

const TAILOR = 'tailor-1';
const MINE = [{ id: 'ok' }];
const NOT_MINE: never[] = [];

function service(queue: unknown[][]) {
  const db = fakeDbQueue(queue);
  return { svc: new GroupOrdersService(db.service as never), db };
}

describe('GroupOrdersService — references must be the tailor’s own', () => {
  // Only the reference actually present in the body is looked up, so each case
  // needs exactly one queued answer: the failing one.
  const cases = [
    { field: 'sharedFabricId' },
    { field: 'templateId' },
    { field: 'ownerMemberId' },
    { field: 'ownerClientId' },
  ];

  it.each(cases)('refuses a foreign $field on create', async ({ field }) => {
    const { svc, db } = service([NOT_MINE]);
    await expect(
      svc.create(TAILOR, { name: 'Wedding', [field]: 'not-mine' } as never),
    ).rejects.toThrow(BadRequestException);
    expect(db.calls).not.toContain('insert');
  });

  it.each(cases)('refuses a foreign $field on update', async ({ field }) => {
    // getById first, then the failing reference check.
    const { svc, db } = service([[{ id: 'group-1', tailorId: TAILOR }], NOT_MINE]);
    await expect(
      svc.update(TAILOR, 'group-1', { [field]: 'not-mine' } as never),
    ).rejects.toThrow(BadRequestException);
    expect(db.calls).not.toContain('update');
  });

  it('refuses a foreign template on the atomic create, before opening the transaction', async () => {
    // createWithMembers already checked the owner; the fabric and template it
    // also writes were unchecked. The assert runs BEFORE the transaction, so a
    // bad reference never starts one.
    const { svc, db } = service([NOT_MINE]);
    await expect(
      svc.createWithMembers(TAILOR, {
        name: 'Wedding',
        templateId: 'not-mine',
        owner: { existingClientId: 'client-1' },
        members: [],
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(db.calls).not.toContain('insert');
  });

  it('accepts a group that points at nothing', async () => {
    const { svc } = service([[{ id: 'group-1', name: 'Wedding' }]]);
    await expect(svc.create(TAILOR, { name: 'Wedding' } as never)).resolves.toBeTruthy();
  });
});
