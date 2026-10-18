// The order state machine. The server rejects a bad transition with 409 and the
// app decides which buttons to show from the same map, so a change here moves
// both at once — and nothing was pinning it.

import { describe, expect, it } from 'vitest';
import {
  canTransitionOrderStatus,
  nextOrderStatuses,
  ORDER_STATUS_TRANSITIONS,
  OrderStatusSchema,
  type OrderStatus,
} from './order';

const ALL = OrderStatusSchema.options;

describe('the map itself', () => {
  it('has an entry for every status in the enum', () => {
    // canTransitionOrderStatus indexes the map directly, so a status without
    // an entry is a TypeError at request time, not a 409.
    for (const s of ALL) {
      expect(ORDER_STATUS_TRANSITIONS[s], `no entry for ${s}`).toBeDefined();
      expect(Array.isArray(ORDER_STATUS_TRANSITIONS[s])).toBe(true);
    }
  });

  it('only ever points at real statuses', () => {
    for (const [from, tos] of Object.entries(ORDER_STATUS_TRANSITIONS)) {
      for (const to of tos) {
        expect(ALL, `${from} → ${to} is not a status`).toContain(to);
      }
    }
  });

  it('never lets a status transition to itself', () => {
    // The service treats same-status as a no-op and returns early. A self-edge
    // here would mean two code paths disagree about what "no change" is.
    for (const [from, tos] of Object.entries(ORDER_STATUS_TRANSITIONS)) {
      expect(tos, `${from} points at itself`).not.toContain(from);
    }
  });

  it('leaves no status stranded — every one can still move somewhere', () => {
    // A dead end would be an order a tailor can never update again.
    for (const s of ALL) {
      expect(nextOrderStatuses(s).length, `${s} is a dead end`).toBeGreaterThan(0);
    }
  });

  it('can reach every status from a new order', () => {
    // Breadth-first from 'registered'. An unreachable status is dead code in
    // the enum and a dead button in the app.
    const seen = new Set<OrderStatus>(['registered']);
    const queue: OrderStatus[] = ['registered'];
    while (queue.length) {
      for (const next of nextOrderStatuses(queue.shift()!)) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    expect([...seen].sort()).toEqual([...ALL].sort());
  });
});

describe('canTransitionOrderStatus', () => {
  it('walks the normal life of an order', () => {
    expect(canTransitionOrderStatus('registered', 'in_progress')).toBe(true);
    expect(canTransitionOrderStatus('in_progress', 'testing')).toBe(true);
    expect(canTransitionOrderStatus('testing', 'delivered')).toBe(true);
  });

  it('refuses to skip the work', () => {
    // A new order cannot be delivered without ever being started — the whole
    // reason the server validates instead of trusting the app.
    expect(canTransitionOrderStatus('registered', 'delivered')).toBe(false);
    expect(canTransitionOrderStatus('registered', 'testing')).toBe(false);
    expect(canTransitionOrderStatus('registered', 'on_pause')).toBe(false);
  });

  it('allows the rework case: a delivered order can be reopened', () => {
    // Documented behaviour, not an oversight — a garment comes back.
    expect(canTransitionOrderStatus('delivered', 'in_progress')).toBe(true);
  });

  it('only lets a paused order resume, not jump ahead', () => {
    expect(canTransitionOrderStatus('on_pause', 'in_progress')).toBe(true);
    expect(canTransitionOrderStatus('on_pause', 'testing')).toBe(false);
    expect(canTransitionOrderStatus('on_pause', 'delivered')).toBe(false);
  });

  it('lets a fitting go back to work as well as forward', () => {
    expect(canTransitionOrderStatus('testing', 'in_progress')).toBe(true);
  });

  it('cannot pause anything but active work', () => {
    expect(canTransitionOrderStatus('in_progress', 'on_pause')).toBe(true);
    expect(canTransitionOrderStatus('testing', 'on_pause')).toBe(false);
    expect(canTransitionOrderStatus('delivered', 'on_pause')).toBe(false);
  });

  it('answers for every possible pair without throwing', () => {
    for (const from of ALL) {
      for (const to of ALL) {
        expect(typeof canTransitionOrderStatus(from, to)).toBe('boolean');
      }
    }
  });
});

describe('nextOrderStatuses', () => {
  it('agrees with canTransitionOrderStatus for every pair', () => {
    // The app reads this one to build its buttons and the server reads the
    // other to accept the request. They must not be able to disagree.
    for (const from of ALL) {
      const allowed = nextOrderStatuses(from);
      for (const to of ALL) {
        expect(allowed.includes(to)).toBe(canTransitionOrderStatus(from, to));
      }
    }
  });
});
