import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { LockProvider, useLock } from '../../lib/lock-context';
import { FloatingScrollProvider } from '../../lib/floating-scroll';
import { PinLockScreen } from '../../components/PinLockScreen';
import { useThemeColors } from '../../lib/theme';

// The (app) group is the signed-in, PIN-gated area. Mirrors the tailor app:
//   auth gate → LockProvider → PIN overlay when locked → the app Stack.
export default function AppLayout() {
  const { session, loading } = useAuth();
  const colors = useThemeColors();

  if (loading) {
    return <Center bg={colors.bg} tint={colors.accent} />;
  }
  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <LockProvider>
      <GatedStack />
    </LockProvider>
  );
}

function GatedStack() {
  const { ready, pinSet, locked } = useLock();
  const colors = useThemeColors();

  // Wait for the initial pinExists() probe so there's no flash of the home
  // screen before the PIN gate can show.
  if (!ready) {
    return <Center bg={colors.bg} tint={colors.accent} />;
  }
  if (locked && pinSet) {
    return <PinLockScreen />;
  }

  return (
    <FloatingScrollProvider>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
            animationDuration: 280,
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        />
      </View>
    </FloatingScrollProvider>
  );
}

function Center({ bg, tint }: { bg: string; tint: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={tint} />
    </View>
  );
}
