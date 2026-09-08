// ============================================================================
// (client) route group — the CLIENT / discovery experience.
//
// Wraps its whole subtree in the rose-pink theme so it reads as its own brand,
// while the tailor tree stays midnight. This nested theme provider is the
// "no bleed" boundary: only screens under (client)/ turn pink. Real screens
// (discover, orders, measurements, requests, messages) are ported here in
// Phase 2; for now it's a single placeholder.
// ============================================================================

import { Stack } from 'expo-router';
import { AtelierThemeProvider } from '@seamflow/ui';
import { useThemeMode } from '../../lib/theme-mode';
import { clientTheme } from '../../lib/client-theme';

export default function ClientLayout() {
  const { mode } = useThemeMode();
  return (
    <AtelierThemeProvider theme={clientTheme(mode)}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </AtelierThemeProvider>
  );
}
