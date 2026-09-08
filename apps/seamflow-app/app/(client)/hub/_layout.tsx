// /hub — the signed-in, PIN-gated area of the CLIENT experience. A real path
// segment (not a group) so its routes (/hub/orders, /hub/messages…) never
// collide with the tailor's bare /orders, /messages. Public discovery
// (/discover, /t) stays outside it. Mirrors the tailor gate: auth →
// LockProvider → PIN overlay → Stack. Inherits the rose theme from
// app/(client)/_layout.
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../../lib/auth-context';
import { LockProvider, useLock } from '../../../lib/lock-context';
import { FloatingScrollProvider } from '../../../lib/floating-scroll';
import { PinLockScreen } from '../../../components/PinLockScreen';
import { useThemeColors } from '../../../lib/theme';

export default function ClientHubLayout() {
  const { session, loading } = useAuth();
  const colors = useThemeColors();

  if (loading) return <Center bg={colors.bg} tint={colors.accent} />;
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <LockProvider>
      <GatedStack />
    </LockProvider>
  );
}

function GatedStack() {
  const { ready, pinSet, locked } = useLock();
  const colors = useThemeColors();

  if (!ready) return <Center bg={colors.bg} tint={colors.accent} />;
  if (locked && pinSet) return <PinLockScreen />;

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
