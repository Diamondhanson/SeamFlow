import { type ReactNode } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, useThemeColors } from '../lib/theme';
import { CONTENT_MAX_WIDTH } from '../lib/use-breakpoint';

export function Screen({
  children,
  padded = true,
}: {
  children: ReactNode;
  padded?: boolean;
}) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  // On wide screens (tablets / landscape) cap the content width and centre it
  // so forms and lists stay a comfortable reading width instead of stretching
  // edge-to-edge. On phones the screen is narrower than the cap, so the body
  // is full-width and the centring is a no-op.
  //
  // We resolve to a CONCRETE pixel width rather than `width: '100%' + maxWidth`.
  // The percentage+maxWidth form leaves Yoga an indefinite width constraint,
  // which makes nested horizontal ScrollViews (e.g. filter-chip rows) measure
  // their content as zero-width and collapse. A definite width avoids that.
  const bodyWidth = Math.min(width, CONTENT_MAX_WIDTH);
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={[styles.body, { width: bodyWidth }, padded && styles.padded]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, alignSelf: 'center' },
  padded: { padding: spacing.lg },
});
