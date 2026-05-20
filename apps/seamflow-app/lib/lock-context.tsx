// ============================================================================
// LockProvider — gates the (app) group when a PIN is configured.
//
// Tracks two pieces of state:
//   pinSet   — whether a PIN exists on this install (read once at mount,
//              re-checked when the PIN settings screen tells us to)
//   locked   — whether the gate is currently engaged
//
// Lock triggers:
//   - Cold start with pinSet=true: locked starts at true
//   - AppState `active` after `background` for ≥ LOCK_AFTER_BACKGROUND_MS:
//     locked flips to true on the next foreground
//   - lock() called manually (used by Sign-out cleanup as a paranoia step)
//
// Unlock triggers:
//   - unlock() called by the PIN entry screen after a successful verify()
//   - refreshPinState() after the user clears their PIN (no PIN → no lock)
//
// The provider itself doesn't render any UI — the (app) layout reads
// `locked && pinSet` and swaps in the PIN screen.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { LOCK_AFTER_BACKGROUND_MS, pinExists } from './pin-lock';

interface LockState {
  /** Has the initial pinExists() check completed? Until then, render nothing. */
  ready: boolean;
  /** Is a PIN configured on this device? */
  pinSet: boolean;
  /** Is the app currently locked? Only meaningful when pinSet is true. */
  locked: boolean;
  /** Mark the app unlocked after a successful PIN entry. */
  unlock: () => void;
  /** Force a lock (e.g. user tapped a future "lock now" button). */
  lock: () => void;
  /**
   * Re-read whether a PIN is configured. Call after the PIN settings
   * screen sets / clears / changes the PIN.
   */
  refreshPinState: () => Promise<void>;
}

const LockContext = createContext<LockState | null>(null);

export function LockProvider({ children }: { children: ReactNode }) {
  const [pinSet, setPinSet] = useState(false);
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);

  // We track the last time the app was actively in foreground. On
  // transition active→background we stamp this; on background→active we
  // check the elapsed time. Using a ref because we don't need to re-render
  // on every AppState event.
  const lastBackgroundedAt = useRef<number | null>(null);

  // Initial probe: is a PIN configured? If yes, start locked.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const exists = await pinExists();
      if (cancelled) return;
      setPinSet(exists);
      setLocked(exists); // cold start with PIN set → locked
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // AppState listener: track background timestamps and lock on resume.
  useEffect(() => {
    const handler = (status: AppStateStatus) => {
      if (status === 'background' || status === 'inactive') {
        lastBackgroundedAt.current = Date.now();
        return;
      }
      if (status === 'active') {
        const stamped = lastBackgroundedAt.current;
        lastBackgroundedAt.current = null;
        if (!stamped) return;
        // Only meaningful if a PIN is configured. If pinSet was just
        // toggled on while in background, this still does the right
        // thing because the next `active` lands here with pinSet=true.
        if (pinSet && Date.now() - stamped >= LOCK_AFTER_BACKGROUND_MS) {
          setLocked(true);
        }
      }
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [pinSet]);

  const unlock = useCallback(() => setLocked(false), []);

  const lock = useCallback(() => {
    if (pinSet) setLocked(true);
  }, [pinSet]);

  const refreshPinState = useCallback(async () => {
    const exists = await pinExists();
    setPinSet(exists);
    if (!exists) setLocked(false);
  }, []);

  const value = useMemo<LockState>(
    () => ({ ready, pinSet, locked, unlock, lock, refreshPinState }),
    [ready, pinSet, locked, unlock, lock, refreshPinState],
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock(): LockState {
  const ctx = useContext(LockContext);
  if (!ctx) {
    throw new Error('useLock must be used inside LockProvider');
  }
  return ctx;
}
