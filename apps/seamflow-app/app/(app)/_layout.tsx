import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View, Platform } from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { LockProvider, useLock } from '../../lib/lock-context';
import { ProfileGateProvider } from '../../lib/profile-gate';
import { BottomChrome } from '../../components/BottomNav';
import { PinLockScreen } from '../../components/PinLockScreen';
import { FloatingScrollProvider } from '../../lib/floating-scroll';
import { useNotificationTapHandler } from '../../lib/notifications';
import { useShareListener } from '../../lib/use-share-listener';
import { useSubscriptionWatch } from '../../lib/subscription';
import { useThemeColors } from '../../lib/theme';

/**
 * How a screen arrives.
 *
 * `default` on iOS is the platform's own push: the outgoing screen parallaxes
 * behind the incoming one and the curve is the one every other iPhone app
 * uses, which is most of why a transition feels native rather than animated.
 * Android has no equivalent gesture-driven push, so it keeps the explicit
 * slide it has always had.
 */
const PUSH_ANIMATION = Platform.OS === 'ios' ? ('default' as const) : ('slide_from_right' as const);


export default function AppLayout() {
  // Keeps the trial countdown and the paywall state current while the app is
  // open, so turning the caps on from the dashboard reaches people without a
  // restart (see lib/subscription).
  useSubscriptionWatch();
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
  //
  // ProfileGateProvider also lives here (not at the root): it reads `useMe`,
  // which only makes sense once authenticated — mounting it over the sign-in
  // screens would fire an unauthenticated /me on every launch.
  return (
    <ProfileGateProvider>
      <LockProvider>
        <GatedStack />
      </LockProvider>
    </ProfileGateProvider>
  );
}

function GatedStack() {
  const { ready, pinSet, locked } = useLock();
  const colors = useThemeColors();

  // Route to the relevant order when a reminder / status push is tapped.
  useNotificationTapHandler();

  // Catch photos shared into SeamFlow from the OS share sheet. Inside the
  // authed layout on purpose: landing a share on the sign-in screen would
  // strand the photos behind it.
  useShareListener();

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
            animation: PUSH_ANIMATION,
            animationDuration: 280,
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        >
          {/* The five screens the tab bar is visible on.
              Gesture off: with tab taps replacing rather than pushing there is
              normally nothing behind these to swipe back to, so this is the
              backstop for the paths that can still leave something there — a
              deep link, a notification tap, a cold start into a sub-route.
              The rule the app promises is simple: while the tab bar is on
              screen, the bar is the only way to move. */}
          <Stack.Screen name="index" options={{ gestureEnabled: false }} />
          <Stack.Screen name="orders/index" options={{ gestureEnabled: false }} />
          <Stack.Screen name="clients/index" options={{ gestureEnabled: false }} />
          <Stack.Screen name="calendar/index" options={{ gestureEnabled: false }} />
          <Stack.Screen name="more" options={{ gestureEnabled: false }} />

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

        {/* Persistent navigation + Ask pill, at every width. Renders itself
            only on the top-level routes. Sits above the Stack, below the PIN
            gate. */}
        <BottomChrome />

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
