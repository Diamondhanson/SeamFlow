// ============================================================================
// The app's "are we online?" signal for phones — one implementation, used by
// both the banner (lib/use-online) and the request queue (lib/query-client), so
// they can never disagree about whether we are online.
//
// The rules live in lib/online-monitor; this file only supplies the two things
// they need: the network library, and a way to ask OUR service whether it is
// up.
// ============================================================================

import NetInfo from '@react-native-community/netinfo';
import { config } from './config';
import { startOnlineMonitor } from './online-monitor';

/** How long to wait for our service before calling it unreachable. */
const SERVICE_CHECK_TIMEOUT_MS = 5000;

/**
 * Does our API answer? Tries the primary host, then the backup (when one is
 * configured), so a network that refuses one name but not the other still counts
 * as online. Any 2xx from /health is a yes.
 */
async function ourServiceAnswers(): Promise<boolean> {
  const bases = [config.apiUrl, config.apiBackupUrl].filter(Boolean);
  for (const base of bases) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SERVICE_CHECK_TIMEOUT_MS);
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/health`, { signal: controller.signal });
      if (res.ok) return true;
    } catch {
      // Unreachable, refused, or timed out — try the next host.
    } finally {
      clearTimeout(timer);
    }
  }
  return false;
}

/** Subscribe to online/offline. Returns the unsubscribe. Native only. */
export function subscribeOnline(listener: (online: boolean) => void): () => void {
  return startOnlineMonitor(listener, {
    subscribe: (cb) => NetInfo.addEventListener(cb),
    checkService: ourServiceAnswers,
  });
}
