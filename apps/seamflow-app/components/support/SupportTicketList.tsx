// ============================================================================
// Help & Support — the user's tickets (plan step 1). Shared by the tailor
// (/(app)/support) and client (/hub/support) sides; only `basePath` differs.
// ============================================================================

import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatTicketRef, type SupportTicket } from '@seamflow/schemas';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../Screen';
import { ScreenHeader } from '../ScreenHeader';
import { Button } from '../Button';
import { SkeletonList } from '../Skeleton';
import { useSupportTickets } from '../../lib/support-queries';
import { spacing, radii } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';
import { SupportStatusChip } from './SupportStatusChip';

export function SupportTicketList({ basePath }: { basePath: string }) {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const q = useSupportTickets();
  const items = q.data?.items ?? [];

  const newTicket = (
    <Button
      label={t('support.newTicket')}
      iconStart={<Ionicons name="add" size={18} color={colors.textOnPrimary} />}
      onPress={() => router.push(`${basePath}/new` as never)}
    />
  );

  return (
    <Screen>
      <ScreenHeader title={t('support.title')} />
      {q.isLoading ? (
        <SkeletonList leading="none" lines={2} chip />
      ) : q.isError && !q.data ? (
        <View style={styles.center}>
          <Text variant="bodySm" tone="textMuted" style={styles.centerText}>
            {t('support.loadFailed')}
          </Text>
          <Button label={t('common.retry')} variant="secondary" onPress={() => void q.refetch()} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={styles.list}
          onRefresh={() => void q.refetch()}
          refreshing={q.isRefetching}
          ListHeaderComponent={
            <View style={styles.head}>
              <Text variant="bodySm" tone="textMuted">
                {t('support.intro')}
              </Text>
              {newTicket}
              {items.length > 0 ? (
                <Text variant="label" tone="textMuted" style={styles.section}>
                  {t('support.yourTickets')}
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
              <Text variant="h3" style={styles.centerText}>
                {t('support.emptyTitle')}
              </Text>
              <Text variant="bodySm" tone="textMuted" style={styles.centerText}>
                {t('support.emptyBody')}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TicketRow ticket={item} onPress={() => router.push(`${basePath}/${item.id}` as never)} />
          )}
        />
      )}
    </Screen>
  );
}

function TicketRow({ ticket, onPress }: { ticket: SupportTicket; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const unread = ticket.unread > 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.hairline, borderRadius: radii.md },
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
    >
      <View style={styles.rowTop}>
        <Text variant="caption" tone="textMuted">
          {formatTicketRef(ticket.number)} · {t(`support.category_${ticket.category}`)}
        </Text>
        <SupportStatusChip status={ticket.status} />
      </View>
      <Text variant="body" numberOfLines={1} style={{ fontWeight: unread ? '700' : '500' }}>
        {ticket.subject}
      </Text>
      <View style={styles.rowBottom}>
        <Text variant="bodySm" tone="textMuted" numberOfLines={1} style={styles.preview}>
          {unread ? t('support.newReply') : ticket.lastMessagePreview}
        </Text>
        <Text variant="caption" tone="textMuted">
          {shortDate(ticket.lastMessageAt)}
        </Text>
        {unread ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
      </View>
    </Pressable>
  );
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xl * 2, gap: spacing.sm },
  head: { gap: spacing.md, marginBottom: spacing.sm },
  section: { marginTop: spacing.md },
  row: { borderWidth: 1, padding: spacing.md, gap: spacing.xs },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  preview: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.sm },
  center: { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.md },
  centerText: { textAlign: 'center' },
});
