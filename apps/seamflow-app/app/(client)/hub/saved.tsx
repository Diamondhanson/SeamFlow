// ============================================================================
// Saved designs — the list.
//
// A two-column grid rather than a list, because what someone saved is a
// picture and they will recognise it faster than they will read its title.
// Deliberately the same shape as Discover: this is the same material, kept.
//
// A DESIGN THAT HAS GONE STILL GETS A CARD
//
// When the maker unpublishes something, or staff take it down after a report,
// the entry stays and says so. Dropping it silently would leave someone with
// one fewer card than they remember and no idea why — and after a takedown the
// honest answer is that it is gone, not that it was never there. They can clear
// it themselves; nothing clears it for them.
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { SavedDesign } from '@seamflow/schemas';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonGrid } from '../../../components/Skeleton';
import { Button } from '../../../components/Button';
import { api } from '../../../lib/api';
import { useDialog } from '../../../lib/dialog';
import { haptics } from '../../../lib/haptics';
import { useTranslation } from '../../../lib/i18n';
import { radii, spacing, useThemeColors } from '../../../lib/theme';
import { useContentWidth, useGridColumns } from '../../../lib/use-breakpoint';

const GAP = spacing.sm;

export default function SavedDesigns() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { colors: atelier } = useAtelierTheme();
  const dialog = useDialog();

  const [rows, setRows] = useState<SavedDesign[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const columns = useGridColumns();
  const contentWidth = useContentWidth('wide') - spacing.lg * 2;
  const tileWidth = Math.floor((contentWidth - GAP * (columns - 1)) / columns);

  const load = useCallback(async () => {
    try {
      const page = await api.feed.saved({ limit: 48 });
      setRows(page.items);
    } catch {
      // An empty list is the honest fallback — see the note in blocked.tsx.
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (item: SavedDesign) => {
    setBusy(item.feedPostId);
    try {
      await api.feed.unsave(item.feedPostId);
      haptics.success();
      setRows((cur) => (cur ?? []).filter((r) => r.feedPostId !== item.feedPostId));
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
        <ScreenHeader title={t('saved.title')} />
        <SkeletonGrid columns={columns} />
      </Screen>
    );
  }

  if (rows.length === 0) {
    return (
      <Screen>
        <ScreenHeader title={t('saved.title')} />
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={30} color={colors.textMuted} />
          <Text variant="body" style={styles.emptyTitle}>
            {t('saved.empty')}
          </Text>
          <Text variant="bodySm" tone="textMuted" style={styles.emptyText}>
            {t('saved.emptyBody')}
          </Text>
          <Button label={t('saved.browse')} onPress={() => router.replace('/(client)/discover')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.padded}>
        <ScreenHeader title={t('saved.title')} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.feedPostId}
        numColumns={columns}
        key={columns}
        columnWrapperStyle={columns > 1 ? { gap: GAP } : undefined}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) =>
          item.post ? (
            <Pressable
              style={{ width: tileWidth }}
              onPress={() => router.push(`/discover/${item.feedPostId}`)}
            >
              <Image
                source={{ uri: item.post.thumbnailUrl }}
                style={[styles.tile, { width: tileWidth, height: tileWidth * 1.3 }]}
              />
              <Text variant="caption" tone="textMuted" numberOfLines={1} style={styles.shop}>
                {item.post.tailor.businessName}
              </Text>
            </Pressable>
          ) : (
            // Gone: unpublished by the shop, or taken down after a report.
            <View style={{ width: tileWidth }}>
              <View
                style={[
                  styles.tile,
                  styles.gone,
                  { width: tileWidth, height: tileWidth * 1.3, backgroundColor: colors.card },
                ]}
              >
                <Ionicons name="eye-off-outline" size={22} color={colors.textMuted} />
                <Text variant="caption" tone="textMuted" style={styles.goneText}>
                  {t('saved.gone')}
                </Text>
                <Pressable onPress={() => void remove(item)} hitSlop={8} disabled={busy === item.feedPostId}>
                  <Text variant="caption" style={{ color: atelier.primary }}>
                    {t('saved.remove')}
                  </Text>
                </Pressable>
              </View>
            </View>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: GAP },
  tile: { borderRadius: radii.md },
  shop: { marginTop: 4, marginBottom: spacing.xs },
  gone: { alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.sm },
  goneText: { textAlign: 'center' },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  emptyTitle: { marginTop: spacing.xs },
  emptyText: { textAlign: 'center', marginBottom: spacing.md },
});
