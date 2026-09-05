import { useEffect, useMemo, useRef } from 'react';
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
import { GettingStarted } from '../../components/GettingStarted';
import { PendingDeletionBanner } from '../../components/PendingDeletionBanner';
import { ProfileReminderBanner } from '../../components/ProfileReminderBanner';
import { ColdStartBanner } from '../../components/ColdStartBanner';
import { InstallHint } from '../../components/InstallHint';
import { WelcomeSlides } from '../../components/WelcomeSlides';
import { OrderCard } from '../../components/OrderCard';
import { BOTTOM_CHROME_SPACE } from '../../components/BottomNav';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useGuides } from '../../lib/guides';
import {
  useMe,
  useOrders,
  useClients,
  useInvoices,
  useUnreadNotificationCount,
} from '../../lib/queries';
import { api, ApiError } from '../../lib/api';
import { useDialog } from '../../lib/dialog';
import type { OrderStatus } from '@seamflow/schemas';
import { daysUntil } from '../../lib/order-status';
import { spacing } from '../../lib/theme';
import { useContentWidth } from '../../lib/use-breakpoint';
import { useFloatingScroll } from '../../lib/floating-scroll';
import { useTranslation } from '../../lib/i18n';

const GAP = spacing.md;

function greetingKeyFor(hour: number): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  if (hour < 12) return 'goodMorning';
  if (hour < 17) return 'goodAfternoon';
  return 'goodEvening';
}

export default function Home() {
  const { signOut } = useAuth();
  const { data: me, error, isLoading: meLoading } = useMe();
  const { colors } = useAtelierTheme();
  const scroll = useFloatingScroll();
  const { t } = useTranslation();
  const dialog = useDialog();

  // Advance an order to its next status straight from the due-soon card, then
  // refresh the dashboard lists. Errors surface through the mapped dialog.
  const advanceOrder = async (orderId: string, next: OrderStatus) => {
    try {
      await api.orders.transition(orderId, { to: next });
      await qc.invalidateQueries();
    } catch (err) {
      await dialog.error(err);
    }
  };

  // 401 recovery (unchanged): one 401 is usually an expiry mid-refresh, not a
  // dead session. Try a single refresh + rerun; sign out only if that fails or
  // a second 401 lands right after.
  const qc = useQueryClient();
  const unreadQ = useUnreadNotificationCount();
  const authRecovery = useRef<'idle' | 'tried'>('idle');
  useEffect(() => {
    if (!(error instanceof ApiError && error.isUnauthorized())) {
      if (!error) authRecovery.current = 'idle';
      return;
    }
    if (authRecovery.current === 'tried') {
      signOut();
      return;
    }
    authRecovery.current = 'tried';
    void (async () => {
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !data.session) {
        signOut();
      } else {
        await qc.invalidateQueries();
      }
    })();
  }, [error, signOut, qc]);

  const { data: ordersData, isLoading: ordersLoading } = useOrders({});
  const { isLoading: clientsLoading } = useClients('');
  const { data: invoicesData } = useInvoices();

  const coldLoading = meLoading || ordersLoading || clientsLoading;

  const orders = ordersData?.items ?? [];
  const openOrders = orders.filter((o) => o.status !== 'delivered');
  const invoicedOrderIds = new Set((invoicesData?.items ?? []).map((i) => i.orderId));
  const awaitingInvoice = orders.filter((o) => !invoicedOrderIds.has(o.id)).length;

  // Two attention lists from the same open-orders set: overdue (past due) and
  // due-soon (0–7 days out), both sorted by delivery date.
  const byDelivery = (a: { dateDelivery: string | null }, b: { dateDelivery: string | null }) =>
    new Date(a.dateDelivery!).getTime() - new Date(b.dateDelivery!).getTime();
  const overdue = useMemo(
    () => openOrders.filter((o) => o.dateDelivery && daysUntil(o.dateDelivery) < 0).sort(byDelivery),
    [openOrders],
  );
  const dueSoon = useMemo(
    () =>
      openOrders
        .filter((o) => {
          if (!o.dateDelivery) return false;
          const d = daysUntil(o.dateDelivery);
          return d >= 0 && d <= 7;
        })
        .sort(byDelivery),
    [openOrders],
  );

  const businessName = me?.tailor?.businessName ?? 'SeamFlow';
  const needsOnboarding = me ? !me.tailor : false;

  const { ready: guidesReady, isDismissed, forceWelcome, endWelcome } = useGuides();
  const showWelcome =
    guidesReady && (needsOnboarding || forceWelcome) && !isDismissed('welcome.intro');
  const greeting = t(`home.${greetingKeyFor(new Date().getHours())}`);
  const unread = unreadQ.data?.count ?? 0;

  // Shortcut cards are laid out two-up within the same wide content cap the
  // <Screen> uses, so they fill a tablet instead of a 760px column.
  const contentWidth = useContentWidth('wide') - spacing.lg * 2;
  const shortWidth = Math.floor((contentWidth - GAP) / 2);
  const calm = !coldLoading && overdue.length === 0 && dueSoon.length === 0;

  return (
    <Screen padded={false} width="wide">
      <ScrollView
        {...scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <ColdStartBanner loading={coldLoading} />
        <PendingDeletionBanner />
        <ProfileReminderBanner />
        <InstallHint />

        {/* Header — greeting + at-a-glance stats on the left, quick icons right. */}
        <View style={styles.hhead}>
          <View style={styles.greet}>
            <Text variant="label" tone="textMuted">
              {greeting.toUpperCase()}
            </Text>
            <Text variant="h1" numberOfLines={2} style={styles.biz}>
              {businessName}
            </Text>
            <View style={styles.stats}>
              <Text variant="bodySm" tone="textMuted">
                <Text variant="mono" style={{ color: colors.primary }}>
                  {coldLoading ? '·' : openOrders.length}
                </Text>{' '}
                {t('home.active')}
              </Text>
              {overdue.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('home.overdueCount', { count: overdue.length })}
                  onPress={() => router.push('/(app)/orders?time=overdue')}
                  style={({ pressed }) => [
                    styles.odpill,
                    {
                      backgroundColor: withAlpha(colors.danger, 0.14),
                      borderColor: withAlpha(colors.danger, 0.3),
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.odDot, { backgroundColor: colors.danger }]} />
                  <Text variant="caption" style={{ color: colors.danger, fontWeight: '600' }}>
                    {t('home.overdueCount', { count: overdue.length })}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.hicons}>
            <IconBtn
              icon="search"
              label={t('home.searchA11y')}
              onPress={() => router.push('/(app)/search')}
            />
            <IconBtn
              icon={unread > 0 ? 'notifications' : 'notifications-outline'}
              label={t('notifications.title')}
              active={unread > 0}
              badge={unread}
              onPress={() => router.push('/(app)/notifications')}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.settings')}
              onPress={() => router.push('/(app)/me')}
              style={({ pressed }) => pressed && styles.pressed}
            >
              {me?.tailor?.photoUrl ? (
                <Image source={{ uri: me.tailor.photoUrl }} style={styles.avatarImg} />
              ) : (
                <Avatar name={businessName} size="md" />
              )}
            </Pressable>
          </View>
        </View>

        {/* Overdue → due-soon: the money-critical view leads, quietly. Each
            block only renders when it has something to show. */}
        {dueSoon.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.slabel}>
              <Text variant="label" tone="textMuted">
                {t('home.dueSoonSection')}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(app)/orders?time=thisWeek')}
                hitSlop={8}
              >
                <Text variant="bodySm" tone="primary">
                  {t('home.seeAll')}
                </Text>
              </Pressable>
            </View>
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
                  onAdvance={(next) => advanceOrder(order.id, next)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {calm ? (
          <View style={[styles.calm, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
            <Text variant="bodySm" tone="textMuted" style={styles.calmText}>
              {t('home.allCaughtUp')}
            </Text>
          </View>
        ) : null}

        {/* Primary action — kept prominent, as approved. */}
        <View style={styles.cta}>
          <Button
            label={t('home.startNewOrder')}
            size="lg"
            onPress={() => router.push('/(app)/new-order')}
          />
        </View>

        <GettingStarted />

        {/* Shortcuts — a few high-value jumps; the long tail lives in "More". */}
        <View style={styles.slabel}>
          <Text variant="label" tone="textMuted">
            {t('home.shortcuts')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(app)/more')}
            hitSlop={8}
          >
            <Text variant="bodySm" tone="primary">
              {t('home.moreLink')}
            </Text>
          </Pressable>
        </View>
        <View style={styles.shorts}>
          <ShortCard
            width={shortWidth}
            icon="receipt"
            tone="warning"
            label={t('invoices.tileLabel')}
            sub={t('home.awaiting')}
            count={awaitingInvoice}
            onPress={() => router.push('/(app)/invoices')}
          />
          <ShortCard
            width={shortWidth}
            icon="megaphone"
            tone="accent"
            label={t('requests.boardTitle')}
            sub={t('requests.tileSubtitle')}
            onPress={() => router.push('/(app)/requests')}
          />
          <ShortCard
            width={shortWidth}
            icon="chatbubbles"
            tone="primary"
            label={t('chat.tabLabel')}
            sub={t('chat.tabSubtitle')}
            onPress={() => router.push('/(app)/messages')}
          />
          <ShortCard
            width={shortWidth}
            icon="shirt"
            tone="success"
            label={t('feed.worksTitle')}
            sub={t('feed.worksTileSubtitle')}
            onPress={() => router.push('/(app)/works')}
          />
        </View>
      </ScrollView>

      {showWelcome ? (
        <WelcomeSlides
          onDone={() => {
            endWelcome();
            if (needsOnboarding) router.push('/(app)/profile-edit?onboarding=1');
          }}
        />
      ) : null}
    </Screen>
  );
}

function IconBtn({
  icon,
  label,
  onPress,
  active,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  badge?: number;
}) {
  const { colors } = useAtelierTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconBtn,
        {
          backgroundColor: colors.surface,
          borderColor: active ? colors.primary : colors.hairline,
        },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={19} color={active ? colors.primary : colors.textMuted} />
      {badge && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text
            variant="caption"
            style={{ color: colors.textOnPrimary, fontSize: 10, lineHeight: 14 }}
          >
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function ShortCard({
  width,
  icon,
  tone,
  label,
  sub,
  count,
  onPress,
}: {
  width: number;
  icon: keyof typeof Ionicons.glyphMap;
  tone: keyof SemanticColors;
  label: string;
  sub: string;
  count?: number;
  onPress: () => void;
}) {
  const { colors } = useAtelierTheme();
  const tint = colors[tone] as string;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.short,
        { width, backgroundColor: colors.surface, borderColor: colors.hairline },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.sq, { backgroundColor: withAlpha(tint, 0.16) }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={styles.shortLabel}>
        <Text variant="bodySm" numberOfLines={1} style={{ fontWeight: '600' }}>
          {label}
        </Text>
        <Text variant="caption" tone="textMuted" numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {count && count > 0 ? (
        <View style={[styles.numPill, { backgroundColor: withAlpha(colors.text, 0.08) }]}>
          <Text variant="mono" style={{ fontSize: 12 }}>
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: BOTTOM_CHROME_SPACE + spacing.lg,
  },
  hhead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  greet: { flex: 1 },
  biz: { marginTop: 4 },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  odpill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingStart: 8,
    paddingEnd: 11,
  },
  odDot: { width: 6, height: 6, borderRadius: 3 },
  hicons: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    end: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  pressed: { opacity: 0.7 },
  section: { marginTop: spacing.xl },
  slabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  rail: { gap: spacing.md, paddingEnd: spacing.lg },
  calm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 16,
  },
  calmText: { flex: 1 },
  cta: { marginTop: spacing.xl },
  shorts: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  short: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 16,
  },
  sq: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortLabel: { flex: 1, minWidth: 0 },
  numPill: {
    minWidth: 24,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
