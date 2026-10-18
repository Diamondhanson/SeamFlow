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
import { fakeDbQueue, fakeTxDb } from '../../test/fakes';

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

describe('OrdersService.create — all three writes or none', () => {
  // The order, its line items and its 'created' audit event were three
  // separate statements. A failure after the first left an order with no items
  // and no creation event, and order_events is append-only, so nothing
  // reconstructs the missing one.

  function txService(failOnWrite?: number) {
    const db = fakeTxDb({
      queue: [
        [{ id: 'client-1' }], // assertClientOwned
        [order()], // the order insert's RETURNING
        [], // items insert
        [], // audit event insert
      ],
      failOnWrite,
    });
    return {
      svc: new OrdersService(db.service as never, noNotifications as never, noPrefs as never),
      db,
    };
  }

  const body = {
    orderName: 'Gown',
    clientId: 'client-1',
    items: [{ garmentType: 'gown', quantity: 1 }],
  };

  it('commits the order, its items and its audit event together', async () => {
    const { svc, db } = txService();
    await expect(svc.create('tailor-1', 'user-1', body as never)).resolves.toMatchObject({
      id: 'order-1',
    });
    // Three writes inside the transaction, all committed.
    expect(db.committed.filter((w) => w === 'insert')).toHaveLength(3);
    expect(db.rolledBack).toBe(false);
  });

  it('keeps no order at all when the line items fail', async () => {
    // Write 1 is the order, write 2 the items. Failing the second has to take
    // the order with it — an order with no garments on it is not a half-saved
    // order, it is a confusing one.
    const { svc, db } = txService(2);
    await expect(svc.create('tailor-1', 'user-1', body as never)).rejects.toThrow();
    expect(db.rolledBack).toBe(true);
    expect(db.committed).not.toContain('insert');
  });

  it('keeps no order when only the audit event fails', async () => {
    // The audit trail is the weakest-looking of the three and the one most
    // likely to be treated as optional. It is not: order_events is how a
    // status history is reconstructed, and it cannot be backfilled.
    const { svc, db } = txService(3);
    await expect(svc.create('tailor-1', 'user-1', body as never)).rejects.toThrow();
    expect(db.rolledBack).toBe(true);
    expect(db.committed).not.toContain('insert');
  });
});
