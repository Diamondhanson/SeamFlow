// ============================================================================
// (client) route group — the CLIENT / discovery experience.
//
// One app, one identity: the customer side renders the SAME Atelier theme as
// the tailor side (light/dark by `mode`), so switching experiences never
// switches brand colours. (It used to apply a rose palette here — removed.)
// ============================================================================

import { Stack } from 'expo-router';
import { StyleSheet, View, Platform } from 'react-native';
import { AtelierThemeProvider } from '@seamflow/ui';
import { useThemeMode } from '../../lib/theme-mode';
import { ClientBottomChrome } from '../../components/BottomNav';

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


export default function ClientLayout() {
  const { mode } = useThemeMode();
  return (
    <AtelierThemeProvider mode={mode}>
      {/* The persistent client tab bar overlays the whole customer experience
          (Discover + hub). It renders itself only on the five top-level routes
          and only when signed in — see ClientBottomChrome. */}
      <View style={styles.flex}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: PUSH_ANIMATION,
          }}
        />
        <ClientBottomChrome />
      </View>
    </AtelierThemeProvider>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
