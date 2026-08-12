// The bug these tests exist for: on 2026-08-12 a tailor tapped "Create +
// continue" eight times on a slow connection and created eight identical
// clients. Every case below is a shape that really happened, or the shape we
// must not break while preventing it.

import { describe, expect, it, vi } from 'vitest';
import { createPressGuard } from './pressGuard';

/** A guard with a clock we control, so nothing here sleeps. */
function setup({ lock = true, lockMs = 600 } = {}) {
  let clock = 1_000;
  const guard = createPressGuard({ lock, lockMs, now: () => clock });
  return { guard, tick: (ms: number) => { clock += ms; } };
}

describe('createPressGuard', () => {
  it('swallows the repeat taps that created eight clients', () => {
    const { guard } = setup();
    const save = vi.fn(() => new Promise(() => {})); // never settles: request in flight

    // Eight taps, as fast as a frustrated thumb can manage.
    let ran = 0;
    for (let i = 0; i < 8; i++) {
      if (guard.shouldRun()) {
        ran++;
        guard.hold(save() as Promise<unknown>, () => {});
      }
    }

    expect(ran).toBe(1);
  });

  it('holds for as long as the request actually takes, not a fixed guess', async () => {
    const { guard, tick } = setup();
    let settle!: () => void;
    const inFlight = new Promise<void>((r) => { settle = r; });

    expect(guard.shouldRun()).toBe(true);
    guard.hold(inFlight, () => {});

    // Well past the fixed lock window, but the request is still going.
    tick(10_000);
    expect(guard.shouldRun()).toBe(false);
    expect(guard.isHeld()).toBe(true);

    settle();
    await inFlight;
    expect(guard.isHeld()).toBe(false);
    expect(guard.shouldRun()).toBe(true);
  });

  it('gives the button back when the save FAILS, so a retry is possible', async () => {
    const { guard } = setup();
    const failed = Promise.reject(new Error('network down'));
    failed.catch(() => {}); // keep the runtime quiet about the rejection

    expect(guard.shouldRun()).toBe(true);
    guard.hold(failed, () => {});
    await failed.catch(() => {});

    expect(guard.isHeld()).toBe(false);
  });

  it('covers the render gap for mutate()-style handlers that return nothing', () => {
    // mutate() returns void, so there is no promise to hold. The fixed lock is
    // the only thing standing between tap two and a duplicate write.
    const { guard, tick } = setup({ lockMs: 600 });

    expect(guard.shouldRun()).toBe(true); // tap 1 → mutate() fires
    tick(120);
    expect(guard.shouldRun()).toBe(false); // tap 2, before isPending re-renders
    tick(200);
    expect(guard.shouldRun()).toBe(false); // tap 3, still inside the window

    tick(400); // 720ms total — window has passed, caller's loading now governs
    expect(guard.shouldRun()).toBe(true);
  });

  it('leaves ordinary rapid-tap buttons completely alone', () => {
    // Steppers, chips, "+ Add attribute", navigation: no loading prop, sync
    // handler. Every tap must land, or we have traded one bug for another.
    const { guard } = setup({ lock: false });

    let ran = 0;
    for (let i = 0; i < 5; i++) if (guard.shouldRun()) ran++;

    expect(ran).toBe(5);
  });

  it('does not block the very press that opens the lock window', () => {
    // Regression guard for an ordering mistake: set the lock before checking
    // it and the first tap blocks itself, making the button appear dead.
    const { guard } = setup();
    expect(guard.shouldRun()).toBe(true);
  });
});
