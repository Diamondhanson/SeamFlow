// ============================================================================
// The double-submit guard, as a pure state machine.
//
// This lives apart from <Button> for one reason: it is the piece that was
// wrong, and it is the piece worth testing. A tailor tapping "Create" four
// times on a slow connection created four clients — real duplicate records in
// a real shop's book. The rendering around it is cosmetic; this is not.
//
// Two windows keep a press from becoming a second write:
//
//   held    — an async onPress returned a promise, and we hold until it
//             settles. Exact, and lasts as long as the work really lasts.
//   locked  — a short fixed window for the `loading={mutation.isPending}`
//             idiom, where mutate() returns void and the caller's flag only
//             reaches us on the NEXT render. That render lags precisely when
//             the JS thread is busy, which is when people tap again.
// ============================================================================

/** See PRESS_LOCK_MS in Button.tsx for why 600ms. */
export interface PressGuardOptions {
  /** Apply the fixed lock window. True only for async-operation buttons. */
  lock: boolean;
  lockMs: number;
  /** Injectable so tests don't sleep. */
  now: () => number;
}

export interface PressGuard {
  /** True if this press should run. False means it was swallowed as a repeat. */
  shouldRun(): boolean;
  /** Call once a press was allowed and produced a promise. */
  hold(promise: Promise<unknown>, onChange: (busy: boolean) => void): void;
  isHeld(): boolean;
}

export function createPressGuard({ lock, lockMs, now }: PressGuardOptions): PressGuard {
  let held = false;
  let lockedUntil = 0;

  return {
    shouldRun() {
      // Order matters: check both windows BEFORE opening a new lock, or the
      // press that opens the lock would immediately be blocked by it.
      if (held || now() < lockedUntil) return false;
      if (lock) lockedUntil = now() + lockMs;
      return true;
    },
    hold(promise, onChange) {
      held = true;
      onChange(true);
      const release = () => {
        held = false;
        onChange(false);
      };
      // Settle either way. A failed save must give the button back so the
      // tailor can retry, not leave it dead until they restart the app.
      promise.then(release, release);
    },
    isHeld() {
      return held;
    },
  };
}
