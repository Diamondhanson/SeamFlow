// ============================================================================
// <HelpCard> — the reusable "starter guide" callout for first-time users.
//
// A soft, tinted card with a friendly one-liner explaining what a screen or
// flow is for. It shows ONCE per device: tapping the dismiss (×) fades it for
// good, remembered by GuidesProvider. Give every placement a unique `guideKey`.
//
//   <HelpCard
//     guideKey="flow.newOrder"
//     title={t('guides.newOrderTitle')}
//     message={t('guides.newOrderBody')}
//   />
//
// Renders nothing once dismissed (or before the guides memory hydrates), so
// it's safe to drop at the top of any screen.
// ============================================================================

import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  IconButton,
  useAtelierTheme,
  withAlpha,
  type SemanticColors,
} from '@seamflow/ui';
import { useGuides } from '../lib/guides';
import { radii, spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

interface HelpCardProps {
  /** Unique key controlling the "show once then fade" memory. */
  guideKey: string;
  /** Short bold heading, e.g. "Creating an order". */
  title: string;
  /** Plain-English one or two sentences explaining the flow. */
  message: string;
  /** Leading icon. Defaults to a friendly lightbulb. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Semantic accent driving the tint. Defaults to primary. */
  tone?: keyof SemanticColors;
  /** Optional layout override (e.g. margins for a specific placement). */
  style?: StyleProp<ViewStyle>;
}

export function HelpCard({
  guideKey,
  title,
  message,
  icon = 'bulb-outline',
  tone = 'primary',
  style,
}: HelpCardProps) {
  const { ready, isDismissed, dismiss } = useGuides();
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();

  // Wait for hydration so the card doesn't flash in then vanish.
  if (!ready || isDismissed(guideKey)) return null;

  const tint = colors[tone];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: withAlpha(tint, 0.08), borderColor: withAlpha(tint, 0.22) },
        style,
      ]}
      accessibilityRole="summary"
    >
      <View style={[styles.iconWrap, { backgroundColor: withAlpha(tint, 0.16) }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={styles.body}>
        <Text variant="bodySm" tone="text" style={styles.title}>
          {title}
        </Text>
        <Text variant="bodySm" tone="textMuted" style={styles.message}>
          {message}
        </Text>
      </View>
      <IconButton
        variant="ghost"
        size="sm"
        onPress={() => dismiss(guideKey)}
        accessibilityLabel={t('common.close')}
      >
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, paddingTop: 2 },
  title: { fontWeight: '700' },
  message: { marginTop: 2, lineHeight: 19 },
});
