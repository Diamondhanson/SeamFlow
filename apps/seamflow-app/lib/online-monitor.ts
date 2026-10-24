// ============================================================================
// "Are we online?" — decided by whether OUR service can be reached, not by
// whether Google can.
//
// On a phone the network library works out `isInternetReachable` by pinging
// Google (clients3.google.com/generate_204). That is a fine question for "is
// there internet at all", and a poor one for "can this app do its job":
//
//   - a router or DNS filter that drops Google while our API is perfectly
//     reachable reads as OFFLINE — red banner, and the app pauses its own
//     requests, which it then never sends;
//   - one lost ping on a shaky connection does the same for a moment.
//
// So a failed Google probe is not believed on its own. When the link is up but
// the probe says unreachable, ask our API (see lib/connectivity for the URLs); if
// IT answers, we are online. Offline is only declared when both agree — and while
// it holds, our API is asked again every RECHECK_MS, because NetInfo only speaks
// when ITS answer changes and would otherwise leave us stuck offline after our
// service came back.
//
// A dead link (no Wi-Fi, no cellular) is believed immediately: no reason to
// doubt it, and nothing to ask.
//
// Pure on purpose — the network library and the service check are passed in — so
// the rules above are tested without a network.
// ============================================================================

export const RECHECK_MS = 10_000;

export interface LinkState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

export interface OnlineMonitorDeps {
  /** Subscribe to link changes; returns the unsubscribe. */
  subscribe: (cb: (state: LinkState) => void) => () => void;
  /** Resolves true when our own service answers. Never needs to throw. */
  checkService: () => Promise<boolean>;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (id: unknown) => void;
}

/** Starts watching. Returns a function that stops everything, timers included. */
export function startOnlineMonitor(
  listener: (online: boolean) => void,
  deps: OnlineMonitorDeps,
): () => void {
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((id) => clearTimeout(id as ReturnType<typeof setTimeout>));

  let stopped = false;
  // Bumped on every link event, so a slow service check that finishes AFTER a
  // newer event cannot overwrite what that event decided.
  let generation = 0;
  let timer: unknown = null;

  const cancelTimer = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };

  const verify = async (mine: number) => {
    const ok = await deps.checkService().catch(() => false);
    if (stopped || mine !== generation) return;
    if (ok) {
      listener(true);
      return;
    }
    listener(false);
    timer = setTimer(() => void verify(mine), RECHECK_MS);
  };

  const unsubscribe = deps.subscribe((state) => {
    generation += 1;
    cancelTimer();
    const mine = generation;

    // No link at all: believe it, there is nothing to ask.
    if (!state.isConnected) return listener(false);
    // Reachable, or the probe has not decided yet: online, as before.
    if (state.isInternetReachable !== false) return listener(true);
    // Link up, probe failed. Don't take Google's word for it.
    void verify(mine);
  });

  return () => {
    stopped = true;
    cancelTimer();
    unsubscribe();
  };
}
