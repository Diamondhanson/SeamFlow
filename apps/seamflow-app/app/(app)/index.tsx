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
import { Tile } from '../../components/Tile';
import { GettingStarted } from '../../components/GettingStarted';
import { PendingDeletionBanner } from '../../components/PendingDeletionBanner';
import { ColdStartBanner } from '../../components/ColdStartBanner';
import { InstallHint } from '../../components/InstallHint';
import { WelcomeSlides } from '../../components/WelcomeSlides';
import { OrderCard } from '../../components/OrderCard';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useGuides } from '../../lib/guides';
import {
  useMe,
  useOrders,
  useClients,
  useTemplates,
  useFabrics,
  useGroupOrders,
  useInvoices,
  useUnreadNotificationCount,
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
  const { data: me, error, isLoading: meLoading } = useMe();
  const { colors } = useAtelierTheme();
  const scroll = useFloatingScroll();
  const { t } = useTranslation();

  // 401 recovery. A single unauthorized response is NOT proof the session is
  // dead — it's usually a token that expired while the app was backgrounded,
  // caught mid-refresh by the parallel query burst on mount. Signing out on
  // the first 401 caused spurious sign-outs (which also used to wipe a
  // freshly-set PIN). Instead: try ONE explicit session refresh and rerun
  // the queries; only sign out if the refresh itself fails, or if a second
  // 401 arrives right after a successful refresh (the session really is
  // dead server-side).
  const qc = useQueryClient();
  const unreadQ = useUnreadNotificationCount();
  const authRecovery = useRef<'idle' | 'tried'>('idle');
  useEffect(() => {
    if (!(error instanceof ApiError && error.isUnauthorized())) {
      // Healthy again — re-arm recovery for a future, unrelated expiry.
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

  // Dashboard counts — lightweight list queries the app already caches.
  const { data: ordersData, isLoading: ordersLoading } = useOrders({});
  const { data: clientsData, isLoading: clientsLoading } = useClients('');
  const { data: templatesData } = useTemplates();
  const { data: fabricsData } = useFabrics();
  const { data: groupsData } = useGroupOrders();
  const { data: invoicesData } = useInvoices();

  // First-paint loading (no cached data yet — cold start / brand-new user).
  // Returning users hydrate from the persisted cache and never see this.
  const coldLoading = meLoading || ordersLoading || clientsLoading;

  const orders = ordersData?.items ?? [];
  const openOrders = orders.filter((o) => o.status !== 'delivered');
  const invoicedOrderIds = new Set(
    (invoicesData?.items ?? []).map((i) => i.orderId),
  );
  const awaitingInvoice = orders.filter((o) => !invoicedOrderIds.has(o.id)).length;
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

  // Brand-new user (signed in, no shop profile yet) who hasn't seen the intro:
  // show the welcome slides once, then hand off to profile setup. `forceWelcome`
  // lets the dev "Preview welcome" button show it on any account.
  const { ready: guidesReady, isDismissed, forceWelcome, endWelcome } = useGuides();
  const showWelcome =
    guidesReady && (needsOnboarding || forceWelcome) && !isDismissed('welcome.intro');
  const greeting = t(`home.${greetingKeyFor(new Date().getHours())}`);
  const monthShort = new Date().toLocaleDateString(undefined, { month: 'short' });

  // For count tiles: when there's nothing yet, show an inviting call-to-action
  // ("Add your first client") instead of a cold "0 people" — clearer for a
  // first-time user. Non-numeric so it reads as a prompt, not a stat.
  const countSub = (
    count: number,
    countKey: string,
    emptyKey: string,
  ): Pick<HomeTile, 'subtitle' | 'subtitleNumeric'> =>
    coldLoading
      ? // Data still on its way — a quiet ellipsis beats a wrong "add your
        // first client" prompt that flips once the server answers.
        { subtitle: '…', subtitleNumeric: false }
      : count === 0
        ? { subtitle: t(emptyKey), subtitleNumeric: false }
        : { subtitle: t(countKey, { count }), subtitleNumeric: true };

  const clientsCount = clientsData?.items.length ?? 0;
  const groupsCount = groupsData?.items.length ?? 0;
  const templatesCount = templatesData?.items.length ?? 0;
  const fabricsCount = fabricsData?.items.length ?? 0;

  const unreadNotifications = unreadQ.data?.count ?? 0;

  const tiles: HomeTile[] = [
    {
      label: t('home.orders'),
      icon: 'list',
      tone: 'primary',
      ...countSub(openOrders.length, 'home.openCount', 'home.ordersEmpty'),
      onPress: () => router.push('/(app)/orders'),
    },
    {
      label: t('home.clients'),
      icon: 'people',
      tone: 'textMuted',
      ...countSub(clientsCount, 'home.peopleCount', 'home.clientsEmpty'),
      onPress: () => router.push('/(app)/clients'),
    },
    {
      label: t('home.groups'),
      icon: 'diamond',
      tone: 'success',
      ...countSub(groupsCount, 'home.eventsCount', 'home.groupsEmpty'),
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
      ...countSub(templatesCount, 'home.patternsCount', 'home.templatesEmpty'),
      onPress: () => router.push('/(app)/templates'),
    },
    {
      label: t('fabrics.tileLabel'),
      icon: 'layers',
      tone: 'success',
      ...countSub(fabricsCount, 'fabrics.tileCount', 'fabrics.tileEmpty'),
      onPress: () => router.push('/(app)/fabrics'),
    },
    {
      // The reverse of the feed: clients asking for work rather than tailors
      // showing it. Sits above Design Studio because it is the one that can
      // put money in front of a tailor who has published nothing.
      label: t('requests.boardTitle'),
      icon: 'megaphone',
      tone: 'accent',
      subtitle: t('requests.tileSubtitle'),
      onPress: () => router.push('/(app)/requests'),
    },
    {
      label: t('home.designStudio'),
      icon: 'color-palette',
      tone: 'accent',
      subtitle: t('home.designStudioSubtitle'),
      onPress: () => router.push('/(app)/designs'),
    },
    {
      // Sits next to Design Studio deliberately: same "look at pictures" idea,
      // opposite direction. Design Studio is inspiration you collected; this is
      // work you made — and it's the only thing that can go public.
      label: t('feed.worksTitle'),
      icon: 'shirt',
      tone: 'primary',
      subtitle: t('feed.worksTileSubtitle'),
      onPress: () => router.push('/(app)/works'),
    },
    {
      // Human enquiries. Sits apart from the Assistant tile on purpose — that
      // one is the AI copilot, this one is a real person waiting for a reply.
      label: t('chat.tabLabel'),
      icon: 'chatbubbles',
      tone: 'primary',
      subtitle: t('chat.tabSubtitle'),
      onPress: () => router.push('/(app)/messages'),
    },
    {
      label: t('home.assistant'),
      icon: 'sparkles',
      tone: 'accent',
      subtitle: t('home.assistantSubtitle'),
      onPress: () => router.push('/(app)/assistant'),
    },
    {
      label: t('invoices.tileLabel'),
      icon: 'receipt',
      tone: 'warning',
      subtitle: t('invoices.tileAwaiting', { count: awaitingInvoice }),
      subtitleNumeric: true,
      onPress: () => router.push('/(app)/invoices'),
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
        {/* Names the wait when the API is cold-starting (shows only after ~3s
            of pending first-load queries — warm opens never see it). */}
        <ColdStartBanner loading={coldLoading} />
        {/* Above everything: someone who regrets asking to be deleted must not
            have to go looking for the way back. */}
        <PendingDeletionBanner />
        {/* iOS Safari only — Android/Chrome prompts on its own. */}
        <InstallHint />

        {/* Greeting hero — the whole banner opens Settings; the avatar + gear
            in the corner signal that affordance. */}
        <View style={styles.heroWrap}>
        <Pressable
          onPress={() => router.push('/(app)/me')}
          accessibilityRole="button"
          accessibilityLabel={t('home.settings')}
          style={({ pressed }) => [
            styles.hero,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.hairline },
            pressed && styles.heroPressed,
          ]}
        >
          <View
            style={[
              styles.heroCircle,
              { backgroundColor: withAlpha(colors.primary, 0.12) },
            ]}
          />

          <View style={styles.avatarBtn}>
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
          </View>

          <Text variant="label" tone="textMuted">
            {greeting.toUpperCase()}
          </Text>
          <Text
            variant="display"
            style={{ marginTop: 4, marginEnd: 80 }}
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
            <Text variant="h2" style={{ color: colors.warning, marginStart: spacing.md }}>
              {dueSoon.length}
            </Text>
            <Text variant="body" tone="textMuted" style={styles.statLabel}>
              {t('home.dueSoonStat')}
            </Text>
          </View>
        </Pressable>

          {/*
            Notification bell.

            A SIBLING of the hero, not a child: the whole hero banner is itself
            a Pressable that opens Settings, and nesting one pressable inside
            another makes which-one-fired depend on gesture-responder ordering.
            Kept outside, the two targets are unambiguous.

            Bottom-right rather than beside the avatar: the avatar already owns
            the top-right, and a bell next to it would push the business name's
            marginEnd from 80 to ~128 — which truncates a two-line name like
            "LYZMA CREATIONS". This corner is empty and still above the fold.
          */}
          <Pressable
            onPress={() => router.push('/(app)/notifications')}
            accessibilityRole="button"
            accessibilityLabel={
              unreadNotifications > 0
                ? `${t('notifications.title')}, ${
                    unreadNotifications === 1
                      ? t('notifications.unreadOne')
                      : t('notifications.unreadMany', { count: unreadNotifications })
                  }`
                : t('notifications.title')
            }
            hitSlop={10}
            style={({ pressed }) => [
              styles.bell,
              {
                backgroundColor: colors.surface,
                borderColor: unreadNotifications > 0 ? colors.primary : colors.hairline,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons
              name={unreadNotifications > 0 ? 'notifications' : 'notifications-outline'}
              size={20}
              color={unreadNotifications > 0 ? colors.primary : colors.textMuted}
            />
            {unreadNotifications > 0 ? (
              <View style={[styles.bellBadge, { backgroundColor: colors.primary }]}>
                <Text
                  variant="caption"
                  style={{ color: colors.textOnPrimary, fontSize: 10, lineHeight: 14 }}
                >
                  {/* Past 9 the exact number stops being useful and starts
                      breaking the circle. */}
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            ) : null}
          </Pressable>
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
          <>
            <GettingStarted />
            <View style={styles.grid}>
              {tiles.map((tile) => (
                <View key={tile.label} style={{ width: tileWidth }}>
                  <Tile {...tile} />
                </View>
              ))}
            </View>
          </>
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

      {/* First-run welcome — a centered dialog over the home screen. */}
      {showWelcome ? (
        <WelcomeSlides
          onDone={() => {
            endWelcome();
            // Genuinely new users go set up their shop; a dev preview just closes.
            if (needsOnboarding) router.push('/(app)/me');
          }}
        />
      ) : null}
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
  heroPressed: { opacity: 0.9 },
  heroWrap: { position: 'relative' },
  bell: {
    position: 'absolute',
    end: spacing.lg,
    bottom: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
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
  heroCircle: {
    position: 'absolute',
    top: -40,
    end: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  avatarBtn: { position: 'absolute', top: spacing.lg, right: spacing.lg },
  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  avatarGear: {
    position: 'absolute',
    end: -2,
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
  statLabel: { marginStart: 6 },
  cta: { marginTop: spacing.lg, marginBottom: spacing.lg },
  onboarding: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  section: { marginTop: spacing.xl },
  sectionLabel: { marginBottom: spacing.md },
  rail: { gap: spacing.md, paddingEnd: spacing.lg },
});
