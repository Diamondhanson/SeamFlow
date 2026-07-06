import { useEffect, useMemo } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  Button,
  Text,
  useAtelierTheme,
  withAlpha,
  type SemanticColors,
} from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { Tile } from '../../components/Tile';
import { OrderCard } from '../../components/OrderCard';
import { useAuth } from '../../lib/auth-context';
import {
  useMe,
  useOrders,
  useClients,
  useTemplates,
  useGroupOrders,
} from '../../lib/queries';
import { ApiError } from '../../lib/api';
import { daysUntil } from '../../lib/order-status';
import { spacing } from '../../lib/theme';
import { useGridColumns, useContentWidth } from '../../lib/use-breakpoint';
import { useFloatingScroll } from '../../lib/floating-scroll';
import { useTranslation } from '../../lib/i18n';

const GRID_GAP = spacing.md;

interface HomeTile {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: keyof SemanticColors;
  subtitle?: string;
  subtitleNumeric?: boolean;
  onPress: () => void;
}

function greetingKeyFor(hour: number): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  if (hour < 12) return 'goodMorning';
  if (hour < 17) return 'goodAfternoon';
  return 'goodEvening';
}

export default function Home() {
  const { signOut } = useAuth();
  const { data: me, error } = useMe();
  const { colors } = useAtelierTheme();
  const scroll = useFloatingScroll();
  const { t } = useTranslation();

  // If the JWT is dead, drop the session.
  useEffect(() => {
    if (error instanceof ApiError && error.isUnauthorized()) {
      signOut();
    }
  }, [error, signOut]);

  // Dashboard counts — lightweight list queries the app already caches.
  const { data: ordersData } = useOrders({});
  const { data: clientsData } = useClients('');
  const { data: templatesData } = useTemplates();
  const { data: groupsData } = useGroupOrders();

  const orders = ordersData?.items ?? [];
  const openOrders = orders.filter((o) => o.status !== 'delivered');
  const dueSoon = useMemo(
    () =>
      openOrders
        .filter((o) => {
          if (!o.dateDelivery) return false;
          const d = daysUntil(o.dateDelivery);
          return d >= 0 && d <= 7;
        })
        .sort(
          (a, b) =>
            new Date(a.dateDelivery!).getTime() -
            new Date(b.dateDelivery!).getTime(),
        ),
    [openOrders],
  );

  const businessName = me?.tailor?.businessName ?? 'SeamFlow';
  const needsOnboarding = me ? !me.tailor : false;
  const greeting = t(`home.${greetingKeyFor(new Date().getHours())}`);
  const monthShort = new Date().toLocaleDateString(undefined, { month: 'short' });

  const tiles: HomeTile[] = [
    {
      label: t('home.orders'),
      icon: 'list',
      tone: 'primary',
      subtitle: t('home.openCount', { count: openOrders.length }),
      subtitleNumeric: true,
      onPress: () => router.push('/(app)/orders'),
    },
    {
      label: t('home.clients'),
      icon: 'people',
      tone: 'textMuted',
      subtitle: t('home.peopleCount', { count: clientsData?.items.length ?? 0 }),
      subtitleNumeric: true,
      onPress: () => router.push('/(app)/clients'),
    },
    {
      label: t('home.groups'),
      icon: 'diamond',
      tone: 'success',
      subtitle: t('home.eventsCount', { count: groupsData?.items.length ?? 0 }),
      subtitleNumeric: true,
      onPress: () => router.push('/(app)/groups'),
    },
    {
      label: t('home.calendar'),
      icon: 'calendar',
      tone: 'warning',
      subtitle: monthShort,
      onPress: () => router.push('/(app)/calendar'),
    },
    {
      label: t('home.templates'),
      icon: 'document-text',
      tone: 'primary',
      subtitle: t('home.patternsCount', {
        count: templatesData?.items.length ?? 0,
      }),
      subtitleNumeric: true,
      onPress: () => router.push('/(app)/templates'),
    },
    {
      label: t('home.designStudio'),
      icon: 'color-palette',
      tone: 'accent',
      subtitle: t('home.designStudioSubtitle'),
      onPress: () => router.push('/(app)/designs'),
    },
  ];

  // Responsive square grid. Width comes from the same wide content cap the
  // <Screen> uses so the tiles fill a tablet instead of a 760px column.
  const columns = useGridColumns();
  const contentWidth = useContentWidth('wide') - spacing.lg * 2;
  const tileWidth = Math.floor(
    (contentWidth - GRID_GAP * (columns - 1)) / columns,
  );

  return (
    <Screen padded={false} width="wide">
      <ScrollView
        {...scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting hero */}
        <View
          style={[
            styles.hero,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.hairline },
          ]}
        >
          <View
            style={[
              styles.heroCircle,
              { backgroundColor: withAlpha(colors.primary, 0.12) },
            ]}
          />

          {/* Profile / settings entry — always visible at the top of home,
              framed by the hero's glow. Tap to open Settings. */}
          <Pressable
            onPress={() => router.push('/(app)/me')}
            style={styles.avatarBtn}
            accessibilityRole="button"
            accessibilityLabel={t('home.settings')}
            hitSlop={8}
          >
            {me?.tailor?.photoUrl ? (
              <Image source={{ uri: me.tailor.photoUrl }} style={styles.avatarImg} />
            ) : (
              <Avatar name={businessName} size="lg" />
            )}
            <View
              style={[
                styles.avatarGear,
                { backgroundColor: colors.surface, borderColor: colors.surfaceElevated },
              ]}
            >
              <Ionicons name="settings-sharp" size={11} color={colors.textMuted} />
            </View>
          </Pressable>

          <Text variant="label" tone="textMuted">
            {greeting.toUpperCase()}
          </Text>
          <Text
            variant="display"
            style={{ marginTop: 4, marginRight: 80 }}
            numberOfLines={2}
          >
            {businessName}
          </Text>
          <View style={styles.statsRow}>
            <Text variant="h2" style={{ color: colors.primary }}>
              {openOrders.length}
            </Text>
            <Text variant="body" tone="textMuted" style={styles.statLabel}>
              {t('home.active')}
            </Text>
            <Text variant="h2" style={{ color: colors.warning, marginLeft: spacing.md }}>
              {dueSoon.length}
            </Text>
            <Text variant="body" tone="textMuted" style={styles.statLabel}>
              {t('home.dueSoonStat')}
            </Text>
          </View>
        </View>

        {/* Primary CTA */}
        <View style={styles.cta}>
          <Button
            label={t('home.startNewOrder')}
            size="lg"
            onPress={() => router.push('/(app)/new-order')}
          />
        </View>

        {needsOnboarding ? (
          <View
            style={[
              styles.onboarding,
              { backgroundColor: colors.surface, borderColor: colors.hairline },
            ]}
          >
            <Text variant="h3">{t('home.onboardingHeading')}</Text>
            <Text
              variant="bodySm"
              tone="textMuted"
              style={{ marginTop: 4, marginBottom: spacing.md }}
            >
              {t('home.onboardingBody')}
            </Text>
            <Button
              label={t('home.onboardingButton')}
              variant="secondary"
              onPress={() => router.push('/(app)/me')}
            />
          </View>
        ) : (
          <View style={styles.grid}>
            {tiles.map((tile) => (
              <View key={tile.label} style={{ width: tileWidth }}>
                <Tile {...tile} />
              </View>
            ))}
          </View>
        )}

        {/* Due soon rail */}
        {dueSoon.length > 0 ? (
          <View style={styles.section}>
            <Text variant="label" tone="textMuted" style={styles.sectionLabel}>
              {t('home.dueSoonSection')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
            >
              {dueSoon.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  variant="rail"
                  onPress={() => router.push(`/(app)/orders/${order.id}`)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 96, // clear the floating logo
  },
  hero: {
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.xl,
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  avatarBtn: { position: 'absolute', top: spacing.lg, right: spacing.lg },
  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  avatarGear: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.md,
  },
  statLabel: { marginLeft: 6 },
  cta: { marginTop: spacing.lg, marginBottom: spacing.lg },
  onboarding: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  section: { marginTop: spacing.xl },
  sectionLabel: { marginBottom: spacing.md },
  rail: { gap: spacing.md, paddingRight: spacing.lg },
});
