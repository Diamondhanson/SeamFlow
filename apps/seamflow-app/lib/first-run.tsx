// ============================================================================
// Has this device ever been through the intro?
//
// Its own storage key, deliberately NOT part of GuidesProvider — that one is
// wiped on sign-out so a fresh account sees the in-app guide cards again, and
// replaying a welcome sequence at someone who signed out and back in would be
// a strange thing to do to them. The intro is a property of the DEVICE, not of
// an account, so it outlives both sign-out and switching accounts.
//
// Mounted above the auth provider because the intro is the first thing a
// brand-new install sees, long before anyone signs in.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'seamflow.intro.seen.v1';

interface FirstRunState {
  /** Storage has settled. Routing must wait: a flash of the intro is worse
   *  than a beat of splash, and a brand-new user would see it twice. */
  ready: boolean;
  /** True once the intro has been completed or skipped on this device. */
  seen: boolean;
  /** Mark it done. Writes through immediately so a kill mid-flow still counts. */
  markSeen: () => void;
}

const FirstRunContext = createContext<FirstRunState | null>(null);

export function FirstRunProvider({ children }: { children: ReactNode }) {
  const [seen, setSeen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (!cancelled && v === '1') setSeen(true);
      })
      // A storage read that fails means we cannot tell. Showing the intro is
      // the kinder wrong answer: seeing it twice is a nuisance, never seeing
      // it leaves someone with no idea what the app is.
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markSeen = useCallback(() => {
    setSeen(true);
    void AsyncStorage.setItem(STORAGE_KEY, '1');
  }, []);

  const value = useMemo<FirstRunState>(() => ({ ready, seen, markSeen }), [ready, seen, markSeen]);
  return <FirstRunContext.Provider value={value}>{children}</FirstRunContext.Provider>;
}

export function useFirstRun(): FirstRunState {
  const ctx = useContext(FirstRunContext);
  if (!ctx) throw new Error('useFirstRun must be used within <FirstRunProvider>');
  return ctx;
}
