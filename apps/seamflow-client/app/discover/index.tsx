// ============================================================================
// Discover — the client app's front door (ROADMAP D.6.1).
//
// This replaces the old tile home. The whole product thesis is here: you land
// on real finished work by real tailors, and every image leads to the person
// who made it.
//
// Renders SIGNED OUT (decision D-4). Browsing needs no account; signing in is
// only required to actually message someone. Gating the feed behind auth would
// mean asking for a commitment before showing anyone why they'd want to make it.
// ============================================================================

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { FeedPostPublic, WorkAudience, WorkOccasion } from '@seamflow/schemas';
import { Text } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SkeletonGrid } from '../../components/Skeleton';
import { useFeed } from '../../lib/queries';
import { useGridColumns, useContentWidth } from '../../lib/use-breakpoint';
import { useFloatingScroll } from '../../lib/floating-scroll';
import { spacing, radii, useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

const AUDIENCES: WorkAudience[] = ['women', 'men', 'unisex', 'children'];
const OCCASIONS: WorkOccasion[] = [
  'wedding',
  'traditional',
  'corporate',
  'casual',
  'party',
];

export default function Discover() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const scroll = useFloatingScroll();

  const [audience, setAudience] = useState<WorkAudience | undefined>();
  const [occasion, setOccasion] = useState<WorkOccasion | undefined>();
  const anyFilter = !!audience || !!occasion;

  const filter = useMemo(() => ({ audience, occasion }), [audience, occasion]);
  const feedQ = useFeed(filter);

  const items: FeedPostPublic[] = useMemo(
    () => (feedQ.data?.pages ?? []).flatMap((p) => p.items),
    [feedQ.data],
  );

  // ── Masonry ───────────────────────────────────────────────────────────────
  const columns = useGridColumns();
  const contentWidth = useContentWidth();
  const gap = spacing.md;
  const cellW = (contentWidth - spacing.lg * 2 - gap * (columns - 1)) / columns;

  const cols: FeedPostPublic[][] = Array.from({ length: columns }, () => []);
  const heights = new Array(columns).fill(0);
  for (const item of items) {
    // Ratio from the stored dimensions, so the grid reserves space before the
    // image loads and never reflows under the reader's thumb.
    const ratio = item.width && item.height ? item.width / item.height : 1;
    const cellH = cellW / ratio + spacing.md;
    const shortest = heights.indexOf(Math.min(...heights));
    cols[shortest]!.push(item);
    heights[shortest] += cellH;
  }

  return (
    <Screen padded={false} width="wide">
      <View style={styles.padded}>
        <ScreenHeader title={t('discover.title')} />
        <Text variant="bodySm" tone="textMuted">
          {t('discover.subtitle')}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {AUDIENCES.map((a) => (
          <Chip
            key={a}
            label={t(`discover.filter${a[0]!.toUpperCase()}${a.slice(1)}`)}
            active={audience === a}
            onPress={() => setAudience(audience === a ? undefined : a)}
          />
        ))}
        {OCCASIONS.map((o) => (
          <Chip
            key={o}
            label={t(`discover.occasion${o[0]!.toUpperCase()}${o.slice(1)}`)}
            active={occasion === o}
            onPress={() => setOccasion(occasion === o ? undefined : o)}
          />
        ))}
        {anyFilter ? (
          <Chip
            label={t('discover.clearFilters')}
            active={false}
            onPress={() => {
              setAudience(undefined);
              setOccasion(undefined);
            }}
          />
        ) : null}
      </ScrollView>

      {feedQ.isLoading && items.length === 0 ? (
        <View style={styles.padded}>
          <SkeletonGrid columns={columns} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="sparkles-outline" size={44} color={colors.textMuted} />
          <Text variant="h3" style={styles.emptyTitle}>
            {anyFilter ? t('discover.noMatch') : t('discover.emptyTitle')}
          </Text>
          {!anyFilter ? (
            <Text variant="bodySm" tone="textMuted" style={styles.emptyText}>
              {t('discover.emptyBody')}
            </Text>
          ) : null}
        </View>
      ) : (
        <ScrollView
          {...scroll}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={() => {
            if (feedQ.hasNextPage && !feedQ.isFetchingNextPage) feedQ.fetchNextPage();
          }}
        >
          <View style={styles.masonry}>
            {cols.map((col, ci) => (
              <View key={ci} style={{ width: cellW, gap: spacing.md }}>
                {col.map((post) => {
                  const ratio = post.width && post.height ? post.width / post.height : 1;
                  return (
                    <Pressable
                      key={post.id}
                      onPress={() =>
                        router.push({
                          pathname: '/(app)/discover/[id]',
                          params: { id: post.id },
                        })
                      }
                    >
                      <Image
                        source={{ uri: post.thumbnailUrl }}
                        style={{
                          width: cellW,
                          height: cellW / ratio,
                          backgroundColor: colors.card,
                          borderRadius: radii.md,
                        }}
                      />
                      {/* Attribution on the tile too, not just in the detail
                          view — the maker is the point, and a grid of anonymous
                          images teaches people to ignore the name. */}
                      <Text variant="caption" tone="textMuted" numberOfLines={1}>
                        {post.tailor.businessName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
          {feedQ.isFetchingNextPage ? (
            <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.textMuted} />
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? colors.accent : colors.card, borderRadius: radii.lg },
      ]}
    >
      <Text variant="bodySm" style={{ color: active ? colors.accentText : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  filterBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  masonry: { flexDirection: 'row', gap: spacing.md },
  empty: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xl * 2 },
  emptyTitle: { marginTop: spacing.md, textAlign: 'center' },
  emptyText: { textAlign: 'center', marginTop: spacing.sm },
});
