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

// What a customer is told when the designer moves their order.
//
// The customer is reached through `order_claims` (the order↔account link made
// when they save a shared order). Only the statuses that are theirs to care
// about notify them — see CLIENT_VISIBLE_STATUS — and a walk-in order with no
// claim has nobody to notify. Nothing checked any of this before, so a refactor
// of `transition` could have silenced customers without a single test failing.
describe('OrdersService.transition — telling the customer', () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  function setup(from: string, to: string, claimants: Array<{ userId: string }>) {
    const emitted: Array<{ userId: string; input: Record<string, any> }> = [];
    const notifications = {
      emit: async (userId: string, input: Record<string, any>) => {
        emitted.push({ userId, input });
      },
      fireAndForget: () => {},
    };
    // getById → update … returning → audit event → claimants lookup
    const queue: unknown[][] = [
      [order({ status: from })],
      [order({ status: to })],
      [],
      claimants,
    ];
    const db = fakeDbQueue(queue);
    const svc = new OrdersService(db.service as never, notifications as never, noPrefs as never);
    return { svc, emitted };
  }

  it('tells every customer who saved the order when it is ready for fitting', async () => {
    const { svc, emitted } = setup('in_progress', 'testing', [{ userId: 'cust-1' }, { userId: 'cust-2' }]);
    await svc.transition(TAILOR, 'user-1', 'order-1', { to: 'testing' } as never);
    await flush();
    expect(emitted.map((e) => e.userId).sort()).toEqual(['cust-1', 'cust-2']);
    expect(emitted[0]!.input.type).toBe('order.ready_for_fitting');
    expect(emitted[0]!.input.entity).toEqual({ type: 'order', id: 'order-1' });
    // The inbox row keeps the name as a snapshot, and the push opens the order.
    expect(emitted[0]!.input.params).toEqual({ orderName: 'Gown' });
    expect(emitted[0]!.input.push.data).toMatchObject({ entityType: 'order', entityId: 'order-1' });
  });

  it('tells them when it has been delivered', async () => {
    const { svc, emitted } = setup('testing', 'delivered', [{ userId: 'cust-1' }]);
    await svc.transition(TAILOR, 'user-1', 'order-1', { to: 'delivered' } as never);
    await flush();
    expect(emitted).toHaveLength(1);
    expect(emitted[0]!.input.type).toBe('order.delivered');
  });

  it('says nothing for the designer’s internal steps', async () => {
    // Only three queries run: no claimants lookup is even attempted.
    const { svc, emitted } = setup('registered', 'in_progress', [{ userId: 'cust-1' }]);
    await svc.transition(TAILOR, 'user-1', 'order-1', { to: 'in_progress' } as never);
    await flush();
    expect(emitted).toHaveLength(0);
  });

  it('has nobody to tell for a walk-in order that no customer saved', async () => {
    const { svc, emitted } = setup('in_progress', 'testing', []);
    await svc.transition(TAILOR, 'user-1', 'order-1', { to: 'testing' } as never);
    await flush();
    expect(emitted).toHaveLength(0);
  });

  it('still completes the status change when telling the customer fails', async () => {
    const { svc } = setup('in_progress', 'testing', [{ userId: 'cust-1' }]);
    (svc as any).notifications.emit = async () => {
      throw new Error('push provider down');
    };
    const row = await svc.transition(TAILOR, 'user-1', 'order-1', { to: 'testing' } as never);
    await flush();
    expect(row.status).toBe('testing');
  });
});
