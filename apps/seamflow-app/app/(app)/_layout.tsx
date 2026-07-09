import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { LockProvider, useLock } from '../../lib/lock-context';
import { PinLockScreen } from '../../components/PinLockScreen';
import { FloatingLogo } from '../../components/FloatingLogo';
import { FloatingScrollProvider } from '../../lib/floating-scroll';
import { useNotificationTapHandler } from '../../lib/notifications';
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

  // Route to the relevant order when a reminder / status push is tapped.
  useNotificationTapHandler();

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

  // Native headers are hidden app-wide — every screen renders its own
  // <ScreenHeader> (large Fraunces title + back chevron). Transitions slide in
  // from the right on both platforms; `gestureEnabled` + `fullScreenGesture`
  // give an iOS full-screen swipe-back, and react-native-screens drives the
  // Android back gesture / predictive-back for the same feel.
  return (
    <FloatingScrollProvider>
      <View style={[styles.flex, { backgroundColor: colors.bg }]}>
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
          {/* Only the modal routes need explicit options now that headers
              are off — everything else inherits the slide + swipe defaults. */}
          <Stack.Screen
            name="clients/new"
            options={{ presentation: 'modal', gestureEnabled: true }}
          />
          <Stack.Screen
            name="groups/new"
            options={{ presentation: 'modal', gestureEnabled: true }}
          />
          <Stack.Screen
            name="templates/new"
            options={{ presentation: 'modal', gestureEnabled: true }}
          />
        </Stack>
        <FloatingLogo />

        {/* PIN gate rendered as an overlay ON TOP of the Stack — not in place
            of it. Swapping the Stack out unmounts the whole navigator, so on
            unlock you'd land on a rootless screen with a dead back button.
            Keeping the Stack mounted underneath preserves your exact place +
            history; unlocking just removes this overlay. */}
        {pinSet && locked ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
            <PinLockScreen />
          </View>
        ) : null}
      </View>
    </FloatingScrollProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
