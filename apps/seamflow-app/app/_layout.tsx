import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { AuthProvider } from '../lib/auth-context';
import {
  installOfflineListeners,
  queryClient,
  queryPersister,
} from '../lib/query-client';
import { OfflineBanner } from '../components/OfflineBanner';
import { colors } from '../lib/theme';

const PERSIST_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function RootLayout() {
  // Hook NetInfo + AppState into TanStack Query exactly once.
  useEffect(() => {
    installOfflineListeners();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: queryPersister,
            maxAge: PERSIST_MAX_AGE_MS,
            // Bump if you change the cache shape or want to invalidate persisted data.
            buster: 'v1',
          }}
        >
          <AuthProvider>
            <StatusBar style="light" />
            <OfflineBanner />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.bg },
                headerTintColor: colors.text,
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="sign-in" options={{ headerShown: false }} />
              <Stack.Screen name="(app)" options={{ headerShown: false }} />
            </Stack>
          </AuthProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
