// ============================================================================
// Notification inbox.
//
// Push is best-effort: it fails silently, arrives while the phone is off, or
// gets swiped away. This screen is the durable record — the thing you can come
// back to when the buzz was missed.
//
// Two rules make it worth opening rather than annoying:
//
//   1. Only EVENTS live here, never states. Chat messages aren't listed (the
//      conversation list is already their inbox) and neither are due/overdue
//      reminders (a state, already a chip on the orders list). The filtering
//      happens server-side in emit(); this screen just renders what it's given.
//
//   2. Opening the screen does NOT mark everything read. Reading is per-tap,
//      plus an explicit "Mark all read". Auto-clearing on open would destroy
//      the ability to come back, which is the entire point.
//
// Body text is rendered HERE from `type` + `params`, never sent pre-rendered by
// the API — so history follows the reader's language and survives a rename.
// ============================================================================

import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Notification } from '@seamflow/schemas';
import { Text } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SkeletonList } from '../../components/Skeleton';
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '../../lib/queries';
import { spacing, radii, useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

/** Icon per family. Falls back rather than throwing on an unknown type. */
function iconFor(type: string): keyof typeof Ionicons.glyphMap {
  if (type.startsWith('quote.')) return 'document-text-outline';
  if (type.startsWith('payment.')) return 'card-outline';
  if (type.startsWith('invoice.')) return 'receipt-outline';
  if (type.startsWith('enquiry.')) return 'chatbubble-ellipses-outline';
  if (type.startsWith('security.')) return 'shield-checkmark-outline';
  if (type.startsWith('moderation.')) return 'flag-outline';
  return 'cube-outline';
}

/** "14:32" today, "Yesterday", else a short date. */
function whenLabel(iso: string, t: (k: string) => string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return t('chat.yesterday');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function Notifications() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const q = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Depend on `refetch`, NOT on `q`.
  //
  // `q` is a fresh object every render, so a [q] dependency makes this effect
  // re-run on every render — and since refetch() causes a render, that is an
  // infinite request loop. It fired 236 requests on a single screen visit and
  // pinned the screen on its skeleton forever, because isLoading never settled.
  // TanStack guarantees `refetch` is stable, which breaks the cycle.
  const { refetch } = q;
  useFocusEffect(
    useCallback(() => {
      void refetch();
      // Intentionally NOT marking everything read here — see the header note.
    }, [refetch]),
  );

  const items = useMemo(
    () => q.data?.pages.flatMap((p) => p.items) ?? [],
    [q.data],
  );
  const unread = q.data?.pages[0]?.unreadCount ?? 0;

  const open = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
    // Route on entityType/entityId. Rows whose entity was deleted keep their
    // text (params carry a snapshot) but simply don't navigate.
    if (!n.entityId) return;
    if (n.entityType === 'order') router.push(`/(app)/orders/${n.entityId}`);
    else if (n.entityType === 'conversation') router.push(`/(app)/messages/${n.entityId}`);
    else if (n.entityType === 'invoice') router.push(`/(app)/orders/${n.entityId}`);
  };

  // Same header (including the settings action) as the loaded screen, so the
  // frame doesn't shift when data arrives.
  const header = (
    <ScreenHeader
      title={t('notifications.title')}
      right={
        <Pressable
          onPress={() => router.push('/(app)/notification-preferences')}
          accessibilityLabel={t('settings.notifications')}
          hitSlop={8}
        >
          <Ionicons name="options-outline" size={20} color={colors.textMuted} />
        </Pressable>
      }
    />
  );

  if (q.isLoading) {
    return (
      <Screen>
        {header}
        <SkeletonList leading="circle" />
      </Screen>
    );
  }

  // A failed fetch must NOT fall through to the empty state. "Nothing yet" and
  // "we couldn't reach the server" look identical to a user but mean opposite
  // things — one is fine, the other needs them to retry or check connectivity.
  if (q.isError) {
    return (
      <Screen>
        {header}
        <View style={styles.empty}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
          <Text variant="h3" style={{ marginTop: spacing.md }}>
            {t('common.error')}
          </Text>
          <Text variant="bodySm" tone="textMuted" style={styles.emptyBody}>
            {t('notifications.loadFailed')}
          </Text>
          <Pressable onPress={() => void q.refetch()} hitSlop={8} style={{ marginTop: spacing.md }}>
            <Text variant="body" tone="primary">{t('common.retry')}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {header}

      {unread > 0 ? (
        <View style={styles.bar}>
          <Text variant="caption" tone="textMuted">
            {unread === 1
              ? t('notifications.unreadOne')
              : t('notifications.unreadMany', { count: unread })}
          </Text>
          <Pressable onPress={() => markAllRead.mutate()} hitSlop={8}>
            <Text variant="caption" tone="primary">
              {t('notifications.markAllRead')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.list}
        onScroll={({ nativeEvent: e }) => {
          const nearEnd =
            e.layoutMeasurement.height + e.contentOffset.y >=
            e.contentSize.height - 400;
          if (nearEnd && q.hasNextPage && !q.isFetchingNextPage) {
            void q.fetchNextPage();
          }
        }}
        scrollEventThrottle={200}
      >
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={40} color={colors.textMuted} />
            <Text variant="h3" style={{ marginTop: spacing.md }}>
              {t('notifications.empty')}
            </Text>
            <Text variant="bodySm" tone="textMuted" style={styles.emptyBody}>
              {t('notifications.emptyBody')}
            </Text>
          </View>
        ) : (
          items.map((n, i) => (
            <Pressable
              key={n.id}
              onPress={() => open(n)}
              style={[
                styles.row,
                // An unread row is a raised card, and the card itself separates
                // it from its neighbours. A read row drops that background and
                // would otherwise float with nothing between it and the next —
                // so it becomes a plain list row divided by a hairline.
                //
                // The radius goes to 0 with it: a bottom border on a rounded box
                // curves away at both ends and reads as a smile, not a divider.
                // The bottom margin goes too, so the line sits against the next
                // row instead of hanging in space above the gap.
                n.readAt
                  ? { backgroundColor: 'transparent', borderRadius: 0, marginBottom: 0 }
                  : { backgroundColor: colors.card, borderRadius: radii.md },
                // Skipped on the last row: a trailing rule under the final item
                // divides it from nothing and reads as an unfinished list.
                n.readAt && i < items.length - 1
                  ? {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.hairline,
                    }
                  : null,
              ]}
            >
              <View
                style={[styles.icon, { backgroundColor: colors.card }]}
              >
                <Ionicons name={iconFor(n.type)} size={18} color={colors.accent} />
              </View>
              <View style={styles.body}>
                <Text variant="body">
                  {/* Keys are dotted in the API, underscored in locale files. */}
                  {t(`notifications.type_${n.type.replace(/\./g, '_')}`, n.params)}
                </Text>
                <Text variant="caption" tone="textMuted" style={{ marginTop: 2 }}>
                  {whenLabel(n.createdAt, t)}
                </Text>
              </View>
              {!n.readAt ? (
                <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              ) : null}
            </Pressable>
          ))
        )}

        {q.isFetchingNextPage ? (
          <ActivityIndicator style={{ marginVertical: spacing.md }} color={colors.textMuted} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  empty: { alignItems: 'center', paddingTop: spacing.xl * 2 },
  emptyBody: { textAlign: 'center', marginTop: spacing.xs },
});
