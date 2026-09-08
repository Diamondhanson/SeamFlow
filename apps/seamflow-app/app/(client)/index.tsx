// Placeholder client home — proves the (client) group mounts and wears the rose
// theme (colors.primary is pink here). Replaced by the ported discovery home in
// Phase 2.
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { Text, useAtelierTheme } from '@seamflow/ui';

export default function ClientHome() {
  const { colors } = useAtelierTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.center}>
        <Text variant="display" style={{ color: colors.primary }}>
          SeamFlow
        </Text>
        <Text variant="body" tone="textMuted" style={styles.sub}>
          Client experience — coming in Phase 2
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  sub: { textAlign: 'center' },
});
