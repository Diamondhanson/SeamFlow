import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { LockProvider, useLock } from '../../lib/lock-context';
import { PinLockScreen } from '../../components/PinLockScreen';
import { useThemeColors } from '../../lib/theme';

export default function AppLayout() {
  const { session, loading } = useAuth();
  const colors = useThemeColors();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  // The lock provider has to live INSIDE the auth gate — there's nothing
  // to lock when no one is signed in, and pin-state should be re-probed
  // on each sign-in (useful when two tailors share a device and only one
  // has set a PIN).
  return (
    <LockProvider>
      <GatedStack />
    </LockProvider>
  );
}

function GatedStack() {
  const { ready, pinSet, locked } = useLock();
  const colors = useThemeColors();

  // Block the first paint until we've checked whether a PIN is configured.
  // Without this we'd flash the home screen for ~50 ms on cold start before
  // the gate engages, which defeats the whole purpose of the gate.
  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (pinSet && locked) {
    return <PinLockScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        // Atelier: nav-bar titles render in Fraunces semibold to match
        // screen-level h1's. Falls back to system if fonts haven't loaded
        // (won't happen — RootLayout gates first paint on fontsReady).
        headerTitleStyle: { fontFamily: 'Fraunces_600SemiBold', fontSize: 18 },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'SeamFlow' }} />
      <Stack.Screen name="me" options={{ title: 'Profile' }} />
      <Stack.Screen name="pin" options={{ title: 'PIN lock' }} />
      <Stack.Screen name="new-order" options={{ title: 'New Order' }} />
      <Stack.Screen name="clients/index" options={{ title: 'Clients' }} />
      <Stack.Screen
        name="clients/new"
        options={{ title: 'New Client', presentation: 'modal' }}
      />
      <Stack.Screen name="clients/[id]" options={{ title: 'Client' }} />
      <Stack.Screen name="groups/index" options={{ title: 'Group Orders' }} />
      <Stack.Screen
        name="groups/new"
        options={{ title: 'New Group Order', presentation: 'modal' }}
      />
      <Stack.Screen name="groups/[id]" options={{ title: 'Group' }} />
      <Stack.Screen name="templates/index" options={{ title: 'Templates' }} />
      <Stack.Screen
        name="templates/new"
        options={{ title: 'New Template', presentation: 'modal' }}
      />
      <Stack.Screen name="templates/[id]" options={{ title: 'Template' }} />
      <Stack.Screen name="orders/index" options={{ title: 'Orders' }} />
      <Stack.Screen name="orders/[id]" options={{ title: 'Order' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
