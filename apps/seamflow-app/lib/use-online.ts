import { useEffect, useState } from 'react';
import { isWeb } from './platform-capabilities';
import { subscribeOnline } from './connectivity';

/**
 * React hook returning the current online state. Defaults to `true` until
 * we hear otherwise so the UI doesn't briefly flash "offline" on cold start.
 * Re-renders whenever connectivity changes.
 *
 * Same split as the onlineManager wiring in lib/query-client.ts, and for the
 * same reason: NetInfo's web reachability probe reports false on a healthy
 * connection, which would show a permanent "offline" banner in the browser.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (isWeb) {
      const on = () => setOnline(true);
      const off = () => setOnline(false);
      window.addEventListener('online', on);
      window.addEventListener('offline', off);
      setOnline(navigator.onLine);
      return () => {
        window.removeEventListener('online', on);
        window.removeEventListener('offline', off);
      };
    }

    // Phones: a failed probe to Google is not believed on its own — our own API
    // gets a say before the banner appears. See lib/online-monitor.
    return subscribeOnline(setOnline);
  }, []);

  return online;
}
