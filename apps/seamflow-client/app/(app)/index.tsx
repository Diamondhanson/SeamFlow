import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { PendingDeletionBanner } from '../../components/PendingDeletionBanner';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme, withAlpha } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../lib/auth-context';
import { useDialog } from '../../lib/dialog';
import { useUnreadNotificationCount } from '../../lib/queries';
import { spacing, radii, useThemeColors } from '../../lib/theme';
import { useTranslation, LANGUAGES, type LanguageCode } from '../../lib/i18n';

function greetingKey(hour: number): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  if (hour < 12) return 'goodMorning';
  if (hour < 17) return 'goodAfternoon';
  return 'goodEvening';
}

interface HomeTile {
  key: string;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  go: () => void;
  live?: boolean;
}

export default function ClientHome() {
  const { t, language, setLanguage } = useTranslation();
  const { colors } = useAtelierTheme();
  const themeColors = useThemeColors();
  const dialog = useDialog();
  const { signOut } = useAuth();

  const greeting = t(`home.${greetingKey(new Date().getHours())}`);
  const unreadNotifications = useUnreadNotificationCount().data?.count ?? 0;

  const comingSoon = () =>
    dialog.alert({ title: t('home.comingSoon'), message: t('home.tagline'), tone: 'info' });

  // Until a real settings screen lands this sits with sign-out and delete
  // below. It cannot wait for that screen: the app picks a language from the
  // device locale, and someone whose phone is set to a language we do not ship
  // lands in English with no way out.
  const onChooseLanguage = async () => {
    const picked = await dialog.pick({
      title: t('common.language'),
      options: LANGUAGES.map((l) => ({ key: l.code, label: l.label })),
      selectedKey: language,
    });
    if (picked && picked !== language) setLanguage(picked as LanguageCode);
  };

  const tiles: HomeTile[] = [
    { key: 'discover', label: t('discover.tabDiscover'), sub: t('discover.subtitle'), icon: 'sparkles-outline', live: true, go: () => router.push('/discover') },
    // Second, right after Discover. Browsing is one way in; asking is the
    // other, and asking works even when nothing has been published yet.
    { key: 'requests', label: t('requests.tileLabel'), sub: t('requests.tileSubtitle'), icon: 'megaphone-outline', live: true, go: () => router.push('/(app)/requests') },
    { key: 'messages', label: t('discover.tabMessages'), sub: t('chat.listSubtitle'), icon: 'chatbubbles-outline', live: true, go: () => router.push('/(app)/messages') },
    { key: 'orders', label: t('home.ordersTile'), sub: t('home.ordersTileSub'), icon: 'shirt-outline', live: true, go: () => router.push('/(app)/orders') },
    { key: 'measurements', label: t('home.measurementsTile'), sub: t('home.measurementsTileSub'), icon: 'body-outline', live: true, go: () => router.push('/(app)/measurements') },
    // Durable record of what happened — push is best-effort, this isn't.
    { key: 'notifications', label: t('notifications.title'),
      sub: unreadNotifications > 0
        ? (unreadNotifications === 1
            ? t('notifications.unreadOne')
            : t('notifications.unreadMany', { count: unreadNotifications }))
        : t('notifications.empty'),
      icon: 'notifications-outline', live: true,
      go: () => router.push('/(app)/notifications') },
    { key: 'lookbook', label: t('home.lookbookTile'), sub: t('home.lookbookTileSub'), icon: 'images-outline', go: comingSoon },
    { key: 'tailors', label: t('home.tailorsTile'), sub: t('home.tailorsTileSub'), icon: 'people-outline', go: comingSoon },
  ];

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Above everything: someone who regrets asking to be deleted must not
            have to go looking for the way back. */}
        <PendingDeletionBanner />

        {/* Greeting hero */}
        <View style={[styles.hero, { backgroundColor: colors.surfaceElevated, borderColor: colors.hairline }]}>
          <View style={[styles.heroBlob, { backgroundColor: withAlpha(colors.primary, 0.14) }]} />
          <Text variant="label" tone="textMuted">{greeting.toUpperCase()}</Text>
          <Text variant="display" style={{ marginTop: 4, color: colors.primary }}>SeamFlow</Text>
          <Text variant="bodySm" tone="textMuted" style={{ marginTop: 6 }}>{t('home.tagline')}</Text>
        </View>

        {/* Tiles */}
        <View style={styles.grid}>
          {tiles.map((tile) => (
            <Pressable
              key={tile.key}
              onPress={tile.go}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: colors.surface, borderColor: colors.hairline },
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={[styles.tileIcon, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
                <Ionicons name={tile.icon} size={22} color={colors.primary} />
              </View>
              <Text variant="h3" style={{ marginTop: spacing.md }}>{tile.label}</Text>
              <Text variant="bodySm" tone="textMuted" style={{ marginTop: 2 }}>{tile.sub}</Text>
              {!tile.live ? (
                <View style={[styles.soon, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
                  <Text variant="caption" style={{ color: colors.primary }}>{t('home.comingSoon')}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => void onChooseLanguage()} hitSlop={8} style={styles.signOut}>
          <Ionicons name="language-outline" size={16} color={themeColors.textMuted} />
          <Text variant="bodySm" tone="textMuted">
            {t('common.language')}
          </Text>
          <Text variant="bodySm" tone="textMuted" style={{ opacity: 0.7 }}>
            {LANGUAGES.find((l) => l.code === language)?.label ?? language}
          </Text>
        </Pressable>

        {/* Temporary sign-out (until a real settings screen lands) */}
        <Pressable onPress={() => void signOut()} hitSlop={8} style={styles.signOut}>
          <Ionicons name="log-out-outline" size={16} color={themeColors.textMuted} />
          <Text variant="bodySm" tone="textMuted">{t('common.signOut')}</Text>
        </Pressable>

        {/* Store policy requires this be reachable from inside the app. It
            moves into settings alongside sign-out when that screen lands. */}
        <Pressable
          onPress={() => router.push('/(app)/delete-account')}
          hitSlop={8}
          style={styles.signOut}
        >
          <Ionicons name="trash-outline" size={16} color={themeColors.textMuted} />
          <Text variant="bodySm" tone="textMuted">{t('account.deleteAccountRow')}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 96 },
  hero: {
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  heroBlob: { position: 'absolute', top: -40, right: -30, width: 160, height: 160, borderRadius: 80 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soon: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: spacing.xl,
  },
});
