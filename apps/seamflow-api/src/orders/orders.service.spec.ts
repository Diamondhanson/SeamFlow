// An order's group pointers must be the tailor's own.
//
// `clientId` and `fabricId` were checked here from the start; `groupOrderId`
// and `groupOrderMemberId` were written straight from the request body. The
// order could then be filed under another tailor's group — and `groupOrderId`
// is a filter `list()` accepts, so the two halves were one query apart from
// being a readable leak rather than only a broken row.

import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { fakeDbQueue } from '../../test/fakes';

const TAILOR = 'tailor-1';
const MINE = [{ id: 'ok' }];
const NOT_MINE: never[] = [];

const noNotifications = { emit: async () => {}, fireAndForget: () => {} };
const noPrefs = { getOrCreate: async () => ({ statusChangeEnabled: false }) };

function service(queue: unknown[][]) {
  const db = fakeDbQueue(queue);
  return {
    svc: new OrdersService(db.service as never, noNotifications as never, noPrefs as never),
    db,
  };
}

function order(over: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    tailorId: TAILOR,
    clientId: 'client-1',
    orderName: 'Gown',
    status: 'registered',
    groupOrderId: null,
    groupOrderMemberId: null,
    ...over,
  };
}

describe('OrdersService — group pointers', () => {
  it('refuses to create an order inside another tailor’s group', async () => {
    // client owned → group NOT owned
    const { svc, db } = service([MINE, NOT_MINE]);
    await expect(
      svc.create(TAILOR, 'user-1', {
        orderName: 'Gown',
        clientId: 'client-1',
        groupOrderId: 'someone-elses-group',
      } as never),
    ).rejects.toThrow(NotFoundException);
    expect(db.calls).not.toContain('insert');
  });

  it('refuses to create an order against another tailor’s group member', async () => {
    const { svc, db } = service([MINE, NOT_MINE]);
    await expect(
      svc.create(TAILOR, 'user-1', {
        orderName: 'Gown',
        clientId: 'client-1',
        groupOrderMemberId: 'someone-elses-member',
      } as never),
    ).rejects.toThrow(NotFoundException);
    expect(db.calls).not.toContain('insert');
  });

  it('refuses to move an existing order into another tailor’s group', async () => {
    // getById → the order; then the group check fails
    const { svc, db } = service([[order()], NOT_MINE]);
    await expect(
      svc.update(TAILOR, 'order-1', { groupOrderId: 'someone-elses-group' } as never),
    ).rejects.toThrow(NotFoundException);
    expect(db.calls).not.toContain('update');
  });

  it('leaves an order with no group pointers alone', async () => {
    // The check must not cost a query when there is nothing to check:
    // client owned → insert → (no items, no group lookups) → audit event.
    const { svc } = service([MINE, [order()], []]);
    await expect(
      svc.create(TAILOR, 'user-1', { orderName: 'Gown', clientId: 'client-1' } as never),
    ).resolves.toMatchObject({ id: 'order-1' });
  });
});
