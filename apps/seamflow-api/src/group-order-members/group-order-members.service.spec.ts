// The tenant boundary on a group member.
//
// Found by the Phase 1 audit: `clientId` was checked against the tailor on
// create and update, and `templateId` on the very next line was not — while
// `resolveTemplate` read the template by id alone and reported its field count
// back in `targetFields`. Either half alone is enough to leak; both are fixed,
// and both are tested here, because a future refactor is far more likely to
// drop one than both.

import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { GroupOrderMembersService } from './group-order-members.service';
import { fakeDbQueue } from '../../test/fakes';

const TAILOR = 'tailor-1';
const MINE = [{ id: 'ok' }];
const NOT_MINE: never[] = [];

/** The joined row `getById` selects: the member plus its group's owner. */
function joined(over: Record<string, unknown> = {}) {
  return [{ member: member(over), groupTailorId: TAILOR }];
}

function member(over: Record<string, unknown> = {}) {
  return {
    id: 'member-1',
    groupOrderId: 'group-1',
    clientId: 'client-1',
    fullName: 'Ada',
    templateId: null,
    garmentType: null,
    measurements: {},
    notes: null,
    position: 0,
    roleLabel: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...over,
  };
}

describe('GroupOrderMembersService — templateId ownership', () => {
  it('refuses to create a member against another tailor’s template', async () => {
    // group owned → client owned → template NOT owned
    const db = fakeDbQueue([MINE, MINE, NOT_MINE]);
    const svc = new GroupOrderMembersService(db.service as never);

    await expect(
      svc.createForGroup(TAILOR, 'group-1', {
        fullName: 'Ada',
        clientId: 'client-1',
        templateId: 'someone-elses-template',
      } as never),
    ).rejects.toThrow(BadRequestException);

    // And it stopped before writing anything.
    expect(db.calls).not.toContain('insert');
  });

  it('refuses to point an existing member at another tailor’s template', async () => {
    // getById → client owned → template NOT owned
    const db = fakeDbQueue([joined(), MINE, NOT_MINE]);
    const svc = new GroupOrderMembersService(db.service as never);

    await expect(
      svc.update(TAILOR, 'member-1', {
        clientId: 'client-1',
        templateId: 'someone-elses-template',
      } as never),
    ).rejects.toThrow(BadRequestException);

    expect(db.calls).not.toContain('update');
  });

  it('still accepts a template the tailor does own', async () => {
    // group owned → client owned → template owned → insert → re-read
    const db = fakeDbQueue([MINE, MINE, MINE, [member({ templateId: 'mine' })], joined({ templateId: 'mine' })]);
    const svc = new GroupOrderMembersService(db.service as never);

    await expect(
      svc.createForGroup(TAILOR, 'group-1', {
        fullName: 'Ada',
        clientId: 'client-1',
        templateId: 'mine',
      } as never),
    ).resolves.toBeTruthy();
    expect(db.calls).toContain('insert');
  });
});

describe('GroupOrderMembersService — the copy-measurements oracle', () => {
  it('reports no template rather than another tailor’s field count', async () => {
    // The attack, end to end: a member carrying a foreign templateId (which is
    // now unreachable through create/update, but may already sit in the data),
    // then the copy that used to read that template by id and hand back
    // `targetFields`.
    //
    //   getById → member with the foreign id
    //   measurementSets for the client → one set of the attacker's own
    //   template lookup, now tailor-scoped → NOT FOUND
    const sets = [
      { id: 'set-1', label: 'latest', templateId: null, values: { chest: 100 } },
    ];
    const db = fakeDbQueue([
      joined({ templateId: 'victim-template' }),
      sets,
      NOT_MINE,
      // the copy still happens — it just has nothing to aim at
      [member({ measurements: { chest: 100 } })],
    ]);
    const svc = new GroupOrderMembersService(db.service as never);

    const res = await svc.copyMeasurementsFromClient(TAILOR, 'member-1', {});

    // The whole point: nothing about the victim's template comes back.
    expect(res.targetFields).toBe(0);
    expect(res.matchedFields).toBe(0);
    // And it degrades to the honest "we did not aim this" state rather than
    // claiming a match it never checked.
    expect(res.match).toBe('untargeted');
  });
});
