// ============================================================================
// ModeProvider — holds the active experience (tailor | client) for the app.
//
// Reads the loaded `/me` profile and resolves the mode via lib/role.ts. Mounted
// once at the root so the entry router (app/index.tsx) and the switch
// affordances can read and change it.
//
// WHY THE CHOICE IS NOT REMEMBERED ACROSS LAUNCHES
//
// It used to be: `setMode` wrote the choice to storage and that stored value
// beat everything on the next launch. The effect was that a tailor who once
// tapped "Browse as a customer" was landed on the customer feed on every cold
// start afterwards, for good — their shop, their orders and their invoices one
// more tap away every single morning, because of a decision they made once.
//
// So the switch is now a decision about THIS session. A cold start asks the
// simpler question instead: do they have a shop? Someone who set one up came to
// run it, and that is where the app opens. Switching still works and still
// sticks — until the app is closed, which is the point at which "where was I"
// stops being a better guess than "what is this person here for".
//
// Nobody with no shop is affected: there is nothing to switch to, so a new
// install still opens on discovery exactly as before.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useMe } from './queries';
import { resolveMode, type Mode } from './role';

interface ModeState {
  /** The resolved active experience. */
  mode: Mode;
  /** Storage + first `/me` have settled — routing should wait for this. */
  ready: boolean;
  /** An explicit switch made during THIS session, if any. */
  preferred: Mode | null;
  /** Switch experiences for the rest of this session. */
  setMode: (m: Mode) => void;
}

const ModeContext = createContext<ModeState | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const meQ = useMe();
  // Starts null on every launch, deliberately — see the note above. Nothing is
  // read from storage, so a cold start has no opinion and the shop decides.
  const [preferred, setPreferred] = useState<Mode | null>(null);

  const setMode = useCallback((m: Mode) => setPreferred(m), []);

  const mode = resolveMode(meQ.data ?? null, preferred);
  // `/me` is the only thing routing waits for now.
  const ready = !meQ.isLoading;

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
