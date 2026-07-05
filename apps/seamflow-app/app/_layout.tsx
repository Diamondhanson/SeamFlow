import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  useFonts as useFraunces,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { AtelierThemeProvider, semanticForMode } from '@seamflow/ui';
import { AuthProvider } from '../lib/auth-context';
import {
  installOfflineListeners,
  queryClient,
  queryPersister,
} from '../lib/query-client';
import { OfflineBanner } from '../components/OfflineBanner';
import { ThemeModeProvider, useThemeMode } from '../lib/theme-mode';
import { FavoritesProvider } from '../lib/favorites';
import { LanguageProvider } from '../lib/i18n';

const PERSIST_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <ThemedRoot />
    </ThemeModeProvider>
  );
}

function ThemedRoot() {
  const { mode } = useThemeMode();
  // Resolve the active palette here so the pre-provider splash, the native
  // nav bar, and the status bar all match the chosen theme.
  const colors = semanticForMode(mode);
  // Hook NetInfo + AppState into TanStack Query exactly once.
  useEffect(() => {
    installOfflineListeners();
  }, []);

  // Load the Atelier font stack. The app delays its first paint until
  // fonts are available — Fraunces / Inter / JetBrainsMono are core to
  // the brand and showing a system-font flash before they swap in would
  // be jarring on a dark-mode launch screen.
  const [fontsReady] = useFraunces({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_500Medium,
  });

  if (!fontsReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: queryPersister,
            maxAge: PERSIST_MAX_AGE_MS,
            // Bump if you change the cache shape or want to invalidate persisted data.
            // v2 — added paused-mutation dehydration in Phase 1.4 polish.
            buster: 'v2',
            dehydrateOptions: {
              // Persist queries normally, AND persist any paused mutation
              // (offline). Successful mutations are skipped (no point
              // persisting completed work). Errored mutations are persisted
              // so the user can see / retry from the pending indicator.
              shouldDehydrateMutation: (m) =>
                m.state.status === 'pending' || m.state.status === 'error',
            },
          }}
          onSuccess={() => {
            // After the persistor rehydrates, replay any mutations that were
            // queued offline last session. resumePausedMutations() is a no-op
            // if we're still offline — onlineManager will fire it again when
            // connectivity returns.
            void queryClient.resumePausedMutations();
          }}
        >
          <AtelierThemeProvider mode={mode}>
            <LanguageProvider>
            <FavoritesProvider>
            <AuthProvider>
              <StatusBar style={mode === 'midnight' ? 'light' : 'dark'} />
              <OfflineBanner />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg },
                  animation: 'slide_from_right',
                  animationDuration: 280,
                  gestureEnabled: true,
                  fullScreenGestureEnabled: true,
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="sign-in" options={{ headerShown: false }} />
                <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
                <Stack.Screen name="(app)" options={{ headerShown: false }} />
              </Stack>
            </AuthProvider>
            </FavoritesProvider>
            </LanguageProvider>
          </AtelierThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
