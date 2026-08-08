// ============================================================================
// Messages — enquiries from people who found the tailor's published work
// (ROADMAP D.4.3).
//
// Deliberately NOT the AI assistant. That is a copilot; this is a human on the
// other end. Different screens, different systems.
//
// The empty state is honest rather than aspirational: until the client app
// ships, nobody CAN message a tailor, and pretending otherwise would leave
// people refreshing an inbox that can never fill.
// ============================================================================

import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Conversation } from '@seamflow/schemas';
import { Avatar, Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonList } from '../../../components/Skeleton';
import { Button } from '../../../components/Button';
import { useConversations, useSimulateEnquiry } from '../../../lib/queries';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { spacing, radii, useThemeColors } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';

/** "14:32" today, "Yesterday", else a short date. */
function whenLabel(iso: string, t: (k: string) => string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return t('chat.yesterday');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function Messages() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const scroll = useFloatingScroll();
  const q = useConversations();
  const simulate = useSimulateEnquiry();
  const dialog = useDialog();

  // Coming back from a thread should show the cleared unread count straight
  // away rather than after the next background refetch.
  useFocusEffect(
    useCallback(() => {
      void q.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const items: Conversation[] = useMemo(
    () => (q.data?.pages ?? []).flatMap((p) => p.items),
    [q.data],
  );

  return (
    <Screen padded={false}>
      <View style={styles.padded}>
        <ScreenHeader title={t('chat.listTitle')} />
        <Text variant="bodySm" tone="textMuted">
          {t('chat.listSubtitle')}
        </Text>
      </View>

      {q.isLoading && items.length === 0 ? (
        <View style={styles.padded}>
          <SkeletonList leading="circle" chip />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={44} color={colors.textMuted} />
          <Text variant="h3" style={styles.emptyTitle}>
            {t('chat.emptyTitle')}
          </Text>
          <Text variant="bodySm" tone="textMuted" style={styles.emptyText}>
            {t('chat.emptyBody')}
          </Text>
          <View style={styles.emptyCta}>
            <Button
              label={t('chat.emptyCta')}
              variant="secondary"
              onPress={() => router.push('/(app)/works')}
            />
          </View>
          {/* Dev builds only. Nothing can create a conversation until the
              client app ships, so without this the chat path is untestable. */}
          {__DEV__ ? (
            <View style={styles.emptyCta}>
              <Button
                label={t('chat.devSimulate')}
                variant="secondary"
                onPress={() =>
                  simulate.mutate(undefined, {
                    onError: (err) => void dialog.error(err),
                  })
                }
                loading={simulate.isPending}
              />
            </View>
          ) : null}
        </View>
      ) : (
        <ScrollView
          {...scroll}
          contentContainerStyle={styles.list}
          onMomentumScrollEnd={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
          }}
        >
          {items.map((c) => {
            const unread = c.unreadCount > 0;
            return (
              <Pressable
                key={c.id}
                onPress={() =>
                  router.push({ pathname: '/(app)/messages/[id]', params: { id: c.id } })
                }
                style={[
                  styles.row,
                  { backgroundColor: colors.card, borderRadius: radii.lg },
                ]}
              >
                {/* The design system's Avatar is initials-only — it derives
                    both the letters and the colour from the name. Clients
                    rarely have an avatar anyway, so initials are the norm. */}
                <Avatar size="md" name={c.counterparty.name} />
                <View style={styles.rowText}>
                  <View style={styles.rowTop}>
                    <Text
                      variant="body"
                      numberOfLines={1}
                      style={{ flex: 1, fontWeight: unread ? '700' : '500' }}
                    >
                      {c.counterparty.name}
                    </Text>
                    <Text variant="caption" tone="textMuted">
                      {whenLabel(c.lastMessageAt, t)}
                    </Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <Text
                      variant="bodySm"
                      tone={unread ? 'text' : 'textMuted'}
                      numberOfLines={1}
                      style={{ flex: 1 }}
                    >
                      {c.lastMessagePreview ?? ''}
                    </Text>
                    {unread ? (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: colors.accent, borderRadius: radii.lg },
                        ]}
                      >
                        <Text variant="caption" style={{ color: colors.accentText }}>
                          {c.unreadCount}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {c.orderId ? (
                    <Text variant="caption" tone="textMuted" style={styles.linked}>
                      {t('chat.linkedOrder')}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
          {q.isFetchingNextPage ? (
            <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.textMuted} />
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  rowText: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { minWidth: 22, alignItems: 'center', paddingHorizontal: spacing.xs, paddingVertical: 1 },
  linked: { marginTop: 2 },
  empty: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xl * 2 },
  emptyTitle: { marginTop: spacing.md, textAlign: 'center' },
  emptyText: { textAlign: 'center', marginTop: spacing.sm },
  emptyCta: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
