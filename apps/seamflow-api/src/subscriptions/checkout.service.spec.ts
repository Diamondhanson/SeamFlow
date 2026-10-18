// Settling a payment. The case that matters is the second write failing.
//
// settle() claims the payment row as 'succeeded' — correctly, so two racing
// deliveries cannot both grant the days — and then grants them. Doing the claim
// first and the grant second outside a transaction meant a failure in between
// left the row reading 'succeeded' with no subscription behind it, and every
// road back was shut: a redelivered webhook returns early on 'succeeded', the
// reconcile cron only looks at 'pending', and the staff recheck comes through
// here too. Someone had paid, the record agreed, and they had nothing.

import { describe, expect, it, vi } from 'vitest';
import { fakeTxDb } from '../../test/fakes';
import { CheckoutService } from './checkout.service';

const PENDING_PAYMENT = {
  id: 'pay-1',
  tailorId: 'tailor-1',
  status: 'pending',
  providerRef: 'ref-1',
  amount: '5000',
  daysAdded: 30,
  plan: 'monthly',
  method: 'mtn_momo',
  provider: 'fapshi',
};

const EVENT = {
  providerRef: 'ref-1',
  paymentId: 'pay-1',
  status: 'succeeded' as const,
  amount: 5000,
};

/**
 * CheckoutService's six dependencies. Only the db and `extendPremium` matter
 * here; the rest are stubs so the constructor is satisfied and a change to its
 * shape shows up as a typecheck error rather than a silent `as never`.
 */
function construct(db: { db: unknown; isConfigured: () => boolean }, extendPremium: unknown) {
  return new CheckoutService(
    db as never,
    { extendPremium, languageFor: async () => 'en' } as never,
    { emit: async () => {} } as never,
    { get: () => undefined } as never,
    {} as never,
    { name: 'fake', isConfigured: () => true } as never,
  );
}

function build(opts: { failOnWrite?: number; extend?: () => Promise<unknown> } = {}) {
  const db = fakeTxDb({
    queue: [
      [PENDING_PAYMENT], // the payment lookup
      [{ id: 'pay-1' }], // the claim's RETURNING
      [], // notifyPaid's shop lookup — empty, so the push bails out quietly.
      //    These tests are about the transaction, not the notification.
    ],
    failOnWrite: opts.failOnWrite,
  });
  const extendPremium = vi.fn(
    opts.extend ?? (async () => ({ premiumUntil: new Date('2026-12-01') })),
  );
  return { svc: construct(db.service, extendPremium), db, extendPremium };
}

/** settle is private; the behaviour under test is reached through it. */
function settle(svc: CheckoutService, event = EVENT) {
  return (svc as unknown as { settle: (e: unknown) => Promise<{ handled: boolean }> }).settle(event);
}

describe('CheckoutService.settle', () => {
  it('claims the payment and grants the days together', async () => {
    const { svc, extendPremium, db } = build();
    await expect(settle(svc)).resolves.toEqual({ handled: true });
    expect(extendPremium).toHaveBeenCalledOnce();
    expect(db.committed).toContain('update');
    expect(db.rolledBack).toBe(false);
  });

  it('grants inside the caller’s transaction, not on its own handle', async () => {
    // If extendPremium is not given the transaction, the two writes commit
    // independently and the whole fix is undone.
    const { svc, extendPremium } = build();
    await settle(svc);
    const opts = (extendPremium.mock.calls as unknown as unknown[][])[0]?.[2];
    expect(opts).toMatchObject({ exec: expect.anything() });
  });

  it('rolls the claim back when granting the days fails', async () => {
    // The payment must be left 'pending' so the provider's retry and the
    // reconcile cron can finish it. This is the regression.
    const { svc, db } = build({
      extend: async () => {
        throw new Error('database went away mid-grant');
      },
    });
    await expect(settle(svc)).rejects.toThrow(/mid-grant/);
    expect(db.rolledBack).toBe(true);
    expect(db.committed).not.toContain('update');
  });

  it('does not grant twice when another delivery already claimed the row', async () => {
    // The claim matches nothing because a racing webhook got there first.
    const db = fakeTxDb({ queue: [[PENDING_PAYMENT], []] });
    const extendPremium = vi.fn();
    const svc = construct(db.service, extendPremium);
    await expect(settle(svc)).resolves.toEqual({ handled: true });
    expect(extendPremium).not.toHaveBeenCalled();
  });

  it('is a no-op for a payment that is already settled', async () => {
    const db = fakeTxDb({ queue: [[{ ...PENDING_PAYMENT, status: 'succeeded' }]] });
    const extendPremium = vi.fn();
    const svc = construct(db.service, extendPremium);
    await expect(settle(svc)).resolves.toEqual({ handled: true });
    expect(extendPremium).not.toHaveBeenCalled();
  });

  it('refuses to settle an underpayment', async () => {
    const { svc, extendPremium } = build();
    await expect(settle(svc, { ...EVENT, amount: 100 })).resolves.toEqual({ handled: false });
    expect(extendPremium).not.toHaveBeenCalled();
  });

  it('refuses a reference belonging to a different payment', async () => {
    const { svc, extendPremium } = build();
    await expect(settle(svc, { ...EVENT, providerRef: 'someone-elses-ref' })).resolves.toEqual({
      handled: false,
    });
    expect(extendPremium).not.toHaveBeenCalled();
  });
});
