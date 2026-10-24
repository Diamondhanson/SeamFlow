import { RECHECK_MS, startOnlineMonitor, type LinkState } from './online-monitor';

/** Drives the monitor by hand: emit link states, resolve service checks, tick timers. */
function harness(checks: Array<boolean | 'throw'> = []) {
  let emit: (s: LinkState) => void = () => {};
  const seen: boolean[] = [];
  const timers = new Map<number, () => void>();
  let nextTimer = 1;
  let serviceCalls = 0;
  const unsubscribed = jest.fn();

  const stop = startOnlineMonitor((o) => seen.push(o), {
    subscribe: (cb) => {
      emit = cb;
      return unsubscribed;
    },
    checkService: async () => {
      const r = checks[serviceCalls++] ?? false;
      if (r === 'throw') throw new Error('boom');
      return r;
    },
    setTimer: (fn) => {
      const id = nextTimer++;
      timers.set(id, fn);
      return id;
    },
    clearTimer: (id) => void timers.delete(id as number),
  });

  const flush = () => new Promise((r) => setImmediate(r));
  const tick = async () => {
    const fns = [...timers.values()];
    timers.clear();
    fns.forEach((f) => f());
    await flush();
  };
  return { emit: (s: LinkState) => emit(s), seen, stop, flush, tick, timers, unsubscribed, calls: () => serviceCalls };
}

const link = (isConnected: boolean | null, isInternetReachable: boolean | null): LinkState => ({
  isConnected,
  isInternetReachable,
});

describe('startOnlineMonitor', () => {
  it('believes a dead link immediately and never asks the service', async () => {
    const h = harness();
    h.emit(link(false, false));
    await h.flush();
    expect(h.seen).toEqual([false]);
    expect(h.calls()).toBe(0);
  });

  it('is online when the probe succeeds, or has not decided yet', async () => {
    const h = harness();
    h.emit(link(true, true));
    h.emit(link(true, null));
    await h.flush();
    expect(h.seen).toEqual([true, true]);
    expect(h.calls()).toBe(0);
  });

  it('does NOT go offline just because Google was unreachable, if our service answers', async () => {
    const h = harness([true]);
    h.emit(link(true, false));
    await h.flush();
    expect(h.seen).toEqual([true]);
    expect(h.calls()).toBe(1);
  });

  it('goes offline only when the probe AND our service both fail', async () => {
    const h = harness([false]);
    h.emit(link(true, false));
    await h.flush();
    expect(h.seen).toEqual([false]);
  });

  it('treats a throwing service check as a failure, not a crash', async () => {
    const h = harness(['throw']);
    h.emit(link(true, false));
    await h.flush();
    expect(h.seen).toEqual([false]);
  });

  it('keeps re-asking while offline, and recovers when the service comes back', async () => {
    const h = harness([false, false, true]);
    h.emit(link(true, false));
    await h.flush();
    expect(h.seen).toEqual([false]);
    expect(h.timers.size).toBe(1); // a re-check is scheduled

    await h.tick(); // still down
    expect(h.seen).toEqual([false, false]);
    await h.tick(); // back
    expect(h.seen).toEqual([false, false, true]);
    expect(h.timers.size).toBe(0); // and it stops asking
    expect(RECHECK_MS).toBeGreaterThan(0);
  });

  it('a newer link event wins over a service check still in flight', async () => {
    const h = harness([false]);
    h.emit(link(true, false)); // check starts…
    h.emit(link(true, true)); // …link recovers before it returns
    await h.flush();
    // The late "false" must not undo the recovery.
    expect(h.seen).toEqual([true]);
  });

  it('stops everything on cleanup, timers included', async () => {
    const h = harness([false]);
    h.emit(link(true, false));
    await h.flush();
    expect(h.timers.size).toBe(1);
    h.stop();
    expect(h.timers.size).toBe(0);
    expect(h.unsubscribed).toHaveBeenCalledTimes(1);
  });
});
