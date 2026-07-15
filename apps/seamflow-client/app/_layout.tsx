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
import { Figtree_400Regular, Figtree_500Medium } from '@expo-google-fonts/figtree';
import { AtelierThemeProvider } from '@seamflow/ui';
import { AuthProvider } from '../lib/auth-context';
import {
  installOfflineListeners,
  queryClient,
  queryPersister,
} from '../lib/query-client';
import { OfflineBanner } from '../components/OfflineBanner';
import { ThemeModeProvider, useThemeMode } from '../lib/theme-mode';
import { DialogProvider } from '../lib/dialog';
import { GuidesProvider } from '../lib/guides';
import { LanguageProvider } from '../lib/i18n';
import { clientTheme } from '../lib/client-theme';

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
  // The consumer app's Atelier theme — same tokens, warm-pink primary.
  const theme = clientTheme(mode);
  const colors = theme.colors;

  // Hook NetInfo + AppState into TanStack Query exactly once (offline-first).
  useEffect(() => {
    installOfflineListeners();
  }, []);

  // Load the Atelier font stack; delay first paint until ready to avoid a
  // system-font flash on the launch screen.
  const [fontsReady] = useFraunces({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_500Medium,
    Figtree_400Regular,
    Figtree_500Medium,
  });

  if (!fontsReady) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}
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
            buster: 'v1',
            dehydrateOptions: {
              // Persist queries normally, AND persist only PAUSED (offline)
              // mutations so edits queued offline survive an app kill.
              shouldDehydrateMutation: (m) => m.state.isPaused,
            },
          }}
          onSuccess={() => {
            // Drop any un-resumable error-state mutations restored from an
            // older cache so they can't wedge the "Syncing…" banner.
            const mc = queryClient.getMutationCache();
            mc.getAll()
              .filter((m) => m.state.status === 'error')
              .forEach((m) => mc.remove(m));
            void queryClient.resumePausedMutations();
          }}
        >
          <AtelierThemeProvider theme={theme}>
            <LanguageProvider>
              <DialogProvider>
                <GuidesProvider>
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
                      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
                      <Stack.Screen name="(app)" options={{ headerShown: false }} />
                    </Stack>
                  </AuthProvider>
                </GuidesProvider>
              </DialogProvider>
            </LanguageProvider>
          </AtelierThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
