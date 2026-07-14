import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useFloatingScroll } from '../../lib/floating-scroll';
import { radii, spacing, useThemeColors } from '../../lib/theme';
import { useThemeMode, type ThemePreference } from '../../lib/theme-mode';
import { useTranslation } from '../../lib/i18n';

// A dedicated screen for choosing the app's appearance. Reached from the
// Settings "Appearance" row. Three selectable rows (system / light / dark)
// with a check on the active one; selecting applies immediately.
const OPTIONS: {
  value: ThemePreference;
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  descKey: string;
}[] = [
  { value: 'system', icon: 'phone-portrait-outline', labelKey: 'settings.system', descKey: 'settings.systemDesc' },
  { value: 'light', icon: 'sunny-outline', labelKey: 'settings.light', descKey: 'settings.lightDesc' },
  { value: 'dark', icon: 'moon-outline', labelKey: 'settings.dark', descKey: 'settings.darkDesc' },
];

export default function AppearanceScreen() {
  const { t } = useTranslation();
  const { preference, setPreference } = useThemeMode();
  const colors = useThemeColors();
  const scroll = useFloatingScroll();

  return (
    <Screen>
      <ScreenHeader title={t('settings.appearance')} subtitle={t('settings.appearanceSubtitle')} />
      <ScrollView
        {...scroll}
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
          {OPTIONS.map((opt, i) => {
            const active = preference === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setPreference(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.hairline }]}
              >
                <Ionicons name={opt.icon} size={22} color={colors.text} style={styles.icon} />
                <View style={styles.textWrap}>
                  <Text variant="body" tone="text">{t(opt.labelKey)}</Text>
                  <Text variant="bodySm" tone="textMuted" style={{ marginTop: 2 }}>
                    {t(opt.descKey)}
                  </Text>
                </View>
                {active ? (
                  <Ionicons name="checkmark" size={22} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  icon: { width: 24, textAlign: 'center' },
  textWrap: { flex: 1 },
});
