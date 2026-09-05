// ============================================================================
// ProfileGate — a graceful client-side gate for actions that expose a tailor
// publicly (sharing an order/invoice, posting to the feed, publishing a design
// or catalogue).
//
// The API already hard-gates these: without a tailor profile, the server throws
// `NotFoundException('No tailor profile for this user — call POST /me/tailor
// first')`. Left to surface, that reaches the user as a raw, developer-facing
// error. Instead, `useRequireProfile()` intercepts BEFORE the call:
//
//   const requireProfile = useRequireProfile();
//   const onShare = () =>
//     requireProfile(() => share(...), 'gate.needsProfileToShareOrder');
//
// If the profile exists, the action runs immediately. Otherwise the user gets a
// friendly "set up your profile first" dialog with a CTA that opens the profile
// form; once they save, they're returned and the original action runs
// automatically — no lost progress. Share/publish hooks are idempotent, so
// re-invoking them on return is safe.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { router } from 'expo-router';
import { useMe } from './queries';
import { useDialog } from './dialog';
import { useTranslation } from './i18n';

type PendingAction = () => void;

interface ProfileGateApi {
  /** True once the tailor profile exists. */
  hasProfile: boolean;
  /**
   * Run `action` if the profile exists; otherwise prompt the user to set it up
   * first. `messageKey` is a `gate.*` key describing the specific action (e.g.
   * `gate.needsProfileToShareOrder`). Returns after the dialog resolves; the
   * action itself may run later, once the profile is saved.
   */
  requireProfile: (action: PendingAction, messageKey: string) => Promise<void>;
  /** Called by the profile form after a successful save — runs any pending action. */
  resolvePending: () => void;
  /** Called by the profile form when it closes without saving — drops any pending action. */
  clearPending: () => void;
}

const ProfileGateContext = createContext<ProfileGateApi | null>(null);

export function ProfileGateProvider({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const dialog = useDialog();
  const { t } = useTranslation();

  const hasProfile = !!me?.tailor;
  // Read through a ref inside the async callback so `requireProfile` doesn't
  // need to be re-created (and re-bound at every call site) on every `me` change.
  const hasProfileRef = useRef(hasProfile);
  hasProfileRef.current = hasProfile;

  const pendingRef = useRef<PendingAction | null>(null);

  const requireProfile = useCallback(
    async (action: PendingAction, messageKey: string) => {
      if (hasProfileRef.current) {
        action();
        return;
      }
      const choice = await dialog.choose({
        title: t('gate.needsProfileTitle'),
        message: t(messageKey),
        tone: 'info',
        actions: [{ label: t('gate.setUpProfile'), value: 'setup' }],
        cancelLabel: t('gate.notNow'),
      });
      if (choice === 'setup') {
        pendingRef.current = action;
        // `returnTo=1` tells the profile form to return here and resolve the
        // pending action on save instead of showing the normal saved dialog.
        router.push('/(app)/profile-edit?returnTo=1');
      }
    },
    [dialog, t],
  );

  const resolvePending = useCallback(() => {
    const action = pendingRef.current;
    pendingRef.current = null;
    // Let the return navigation settle before re-triggering, so the action runs
    // on the (still-mounted) origin screen rather than mid-transition.
    if (action) setTimeout(action, 0);
  }, []);

  const clearPending = useCallback(() => {
    pendingRef.current = null;
  }, []);

  const value = useMemo<ProfileGateApi>(
    () => ({ hasProfile, requireProfile, resolvePending, clearPending }),
    [hasProfile, requireProfile, resolvePending, clearPending],
  );

  return <ProfileGateContext.Provider value={value}>{children}</ProfileGateContext.Provider>;
}

function useProfileGate(): ProfileGateApi {
  const ctx = useContext(ProfileGateContext);
  if (!ctx) throw new Error('useProfileGate must be used within <ProfileGateProvider>');
  return ctx;
}

/**
 * The gate function for action call sites. See the module header for usage.
 */
export function useRequireProfile(): ProfileGateApi['requireProfile'] {
  return useProfileGate().requireProfile;
}

/**
 * Full gate API — used by the profile form to resolve/clear a pending action,
 * and anywhere that needs to read `hasProfile`.
 */
export function useProfileGateControls(): ProfileGateApi {
  return useProfileGate();
}
