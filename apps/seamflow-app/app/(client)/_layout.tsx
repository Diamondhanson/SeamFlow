// ============================================================================
// (client) route group — the CLIENT / discovery experience.
//
// One app, one identity: the customer side renders the SAME Atelier theme as
// the tailor side (light/dark by `mode`), so switching experiences never
// switches brand colours. (It used to apply a rose palette here — removed.)
// ============================================================================

import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AtelierThemeProvider } from '@seamflow/ui';
import { useThemeMode } from '../../lib/theme-mode';
import { ClientBottomChrome } from '../../components/BottomNav';

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
            animation: 'slide_from_right',
          }}
        />
        <ClientBottomChrome />
      </View>
    </AtelierThemeProvider>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
