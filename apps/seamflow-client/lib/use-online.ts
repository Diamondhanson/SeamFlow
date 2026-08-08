import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { isWeb } from './platform-capabilities';

/**
 * React hook returning the current online state. Defaults to `true` until
 * NetInfo reports otherwise so the UI doesn't briefly flash "offline" on
 * cold start. Re-renders whenever connectivity changes.
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

    const sub = NetInfo.addEventListener((state) => {
      const isOnline =
        state.isInternetReachable === null
          ? !!state.isConnected
          : !!state.isInternetReachable;
      setOnline(isOnline);
    });
    return () => sub();
  }, []);

  return online;
}
