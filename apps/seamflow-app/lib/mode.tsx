// ============================================================================
// ModeProvider — holds the active experience (tailor | client) for the app.
//
// Reads the loaded `/me` profile (react-query) + a remembered on-device
// preference and resolves the mode via lib/role.ts. Mounted once at the root so
// the entry router (app/index.tsx) and the switch affordances (later) can read
// and change it. `setMode` persists the choice so a dual user lands where they
// left off; changing it re-routes the app to the other experience's tree.
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
import { useMe } from './queries';
import { resolveMode, type Mode } from './role';

const STORAGE_KEY = 'seamflow.mode.preferred.v1';

interface ModeState {
  /** The resolved active experience. */
  mode: Mode;
  /** Storage + first `/me` have settled — routing should wait for this. */
  ready: boolean;
  /** The user's explicit choice, if any (dual users). */
  preferred: Mode | null;
  /** Switch experiences and remember it. */
  setMode: (m: Mode) => void;
}

const ModeContext = createContext<ModeState | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const meQ = useMe();
  const [preferred, setPreferred] = useState<Mode | null>(null);
  const [prefLoaded, setPrefLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (!cancelled) setPreferred(v === 'tailor' || v === 'client' ? v : null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPrefLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((m: Mode) => {
    setPreferred(m);
    void AsyncStorage.setItem(STORAGE_KEY, m);
  }, []);

  const mode = resolveMode(meQ.data ?? null, preferred);
  const ready = prefLoaded && !meQ.isLoading;

  const value = useMemo<ModeState>(
    () => ({ mode, ready, preferred, setMode }),
    [mode, ready, preferred, setMode],
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeState {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within <ModeProvider>');
  return ctx;
}
