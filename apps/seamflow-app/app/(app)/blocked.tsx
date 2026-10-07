// ============================================================================
// Blocked accounts.
//
// Blocking happens in the moment, from a message menu, and that is the right
// place for it — but a block with no way back is a trap rather than a tool.
// This screen exists so the decision stays reversible, and so someone can see
// what they have done months later when they have forgotten.
//
// Deliberately plain: a list, a name, an Unblock. There is nothing to filter
// and nothing to sort, because anyone with enough blocks to need either has a
// problem this screen cannot solve.
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BlockedUser } from '@seamflow/schemas';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SkeletonList } from '../../components/Skeleton';
import { Button } from '../../components/Button';
import { api } from '../../lib/api';
import { useDialog } from '../../lib/dialog';
import { haptics } from '../../lib/haptics';
import { useTranslation } from '../../lib/i18n';
import { radii, spacing, useThemeColors } from '../../lib/theme';

export default function BlockedAccounts() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { colors: atelier } = useAtelierTheme();
  const dialog = useDialog();

  const [rows, setRows] = useState<BlockedUser[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await api.moderation.blocks());
    } catch {
      // An empty list is the honest fallback: this screen can only ever tell
      // you about blocks, and failing to load one must not look like a block
      // that vanished.
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const nameOf = (b: BlockedUser) => b.shopName || b.name || t('report.blockedTitle');

  const unblock = async (b: BlockedUser) => {
    const ok = await dialog.confirm({
      title: t('report.unblockTitle', { name: nameOf(b) }),
      message: t('report.unblockBody'),
      confirmLabel: t('report.unblock'),
    });
    if (!ok) return;
    setBusy(b.userId);
    try {
      await api.moderation.unblock(b.userId);
      haptics.success();
      setRows((cur) => (cur ?? []).filter((r) => r.userId !== b.userId));
    } catch (err) {
      haptics.error();
      await dialog.error(err);
    } finally {
      setBusy(null);
    }
  };

  if (rows === null) {
    return (
      <Screen>
        <ScreenHeader title={t('report.blockedTitle')} />
        <SkeletonList leading="circle" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={t('report.blockedTitle')} />
      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="hand-left-outline" size={28} color={colors.textMuted} />
          <Text variant="body" tone="textMuted" style={styles.emptyText}>
            {t('report.blockedEmpty')}
          </Text>
        </View>
      ) : (
        <>
          <Text variant="bodySm" tone="textMuted" style={styles.lede}>
            {t('report.blockedLede')}
          </Text>
          <FlatList
            data={rows}
            keyExtractor={(b) => b.userId}
            ItemSeparatorComponent={() => (
              <View style={[styles.sep, { backgroundColor: colors.hairline }]} />
            )}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: atelier.primarySoft }]}>
                  <Ionicons name="person" size={18} color={colors.textMuted} />
                </View>
                <Text variant="body" numberOfLines={1} style={styles.name}>
                  {nameOf(item)}
                </Text>
                <Button
                  label={t('report.unblock')}
                  variant="secondary"
                  onPress={() => void unblock(item)}
                  loading={busy === item.userId}
                />
              </View>
            )}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lede: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { flex: 1 },
  sep: { height: StyleSheet.hairlineWidth },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl, borderRadius: radii.lg },
  emptyText: { textAlign: 'center' },
});
