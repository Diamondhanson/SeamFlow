// ============================================================================
// "What brings you to SeamFlow?" — shown once, right after a new account is
// verified. It seeds the DEFAULT experience (a soft choice, not a wall — the
// user can switch anytime from either side):
//   - tailor  → set mode + go create the shop profile (existing onboarding)
//   - client  → set mode + drop into public discovery
//
// Existing users signing back in never see this; the entry router resolves
// their mode from /me.
// ============================================================================

import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme, withAlpha } from '@seamflow/ui';
import { Screen } from '../components/Screen';
import { useMode } from '../lib/mode';
import { spacing, radii } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

export default function ChooseRole() {
  const { t } = useTranslation();
  const { setMode } = useMode();
  const { colors } = useAtelierTheme();

  const choose = (mode: 'tailor' | 'client') => {
    if (mode === 'tailor') {
      // Not setMode('tailor') yet: there is no shop to run until the profile is
      // saved, and the editor flips the mode at that point (or on Skip). Flipping
      // here left anyone who abandoned setup in a designer mode with nothing in it.
      router.replace('/(app)/profile-edit?onboarding=1' as Href);
    } else {
      setMode('client');
      router.replace('/(client)/discover' as Href);
    }
  };

  return (
    <Screen>
      <View style={styles.body}>
        <Text variant="h1" style={styles.title}>
          {t('role.title')}
        </Text>
        <Text variant="bodySm" tone="textMuted" style={styles.subtitle}>
          {t('role.subtitle')}
        </Text>

        <View style={styles.cards}>
          <RoleCard
            icon="cut-outline"
            title={t('role.tailorTitle')}
            sub={t('role.tailorSub')}
            color={colors.primary}
            onPress={() => choose('tailor')}
          />
          <RoleCard
            icon="sparkles-outline"
            title={t('role.clientTitle')}
            sub={t('role.clientSub')}
            color={colors.accent}
            onPress={() => choose('client')}
          />
        </View>
      </View>
    </Screen>
  );
}

function RoleCard({
  icon,
  title,
  sub,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  color: string;
  onPress: () => void;
}) {
  const { colors } = useAtelierTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.hairline },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.cardIcon, { backgroundColor: withAlpha(color, 0.16) }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <View style={styles.cardText}>
        <Text variant="h3">{title}</Text>
        <Text variant="bodySm" tone="textMuted" style={{ marginTop: 2 }}>
          {sub}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center' },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  cards: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radii.lg,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, minWidth: 0 },
});
