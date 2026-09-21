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

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { FeedPostPublic, WorkAudience, WorkOccasion } from '@seamflow/schemas';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { SkeletonGrid } from '../../../components/Skeleton';
import { SearchField } from '../../../components/SearchField';
import { Button } from '../../../components/Button';
import { ImageCaption } from '../../../components/client/ImageCaption';
import { BOTTOM_CHROME_SPACE } from '../../../components/BottomNav';
import { useFeed } from '../../../lib/consumer-queries';
import { useGridColumns, useContentWidth } from '../../../lib/use-breakpoint';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { spacing, radii, useThemeColors } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { useDebouncedValue } from '../../../lib/use-debounced-value';

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
  const { session } = useAuth();
  const { mode } = useAtelierTheme();

  // Discover is the app's front door — nothing to go "back" to, and the brand
  // belongs here rather than a page title. Keep the browser tab named, which
  // ScreenHeader used to do for us.
  useEffect(() => {
    try {
      if (globalThis.document) globalThis.document.title = `${t('discover.title')} · SeamFlow`;
    } catch {
      // no DOM — nothing to do
    }
  }, [t]);

  // ── Collapsing header ─────────────────────────────────────────────────────
  // Scrolling down slides the wordmark row (and tagline) up and away, leaving
  // search + filters pinned; any scroll back up brings it back. Driven by
  // direction, not position, so it returns the moment someone reaches for it
  // rather than only at the very top.
  const headerH = useSharedValue(0);
  const hidden = useSharedValue(0);
  const lastY = useRef(0);
  const travel = useRef(0);
  const setHidden = (h: boolean) => {
    const target = h ? 1 : 0;
    if (hidden.value !== target) hidden.value = withTiming(target, { duration: 220 });
  };
  const onGridScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const y = contentOffset.y;
    const dy = y - lastY.current;
    lastY.current = y;
    if (y <= 8) {
      travel.current = 0;
      return setHidden(false);
    }
    // Collapsing the header makes the list taller, which can clamp the offset
    // at the bottom edge and read as an upward scroll — ignore movement there
    // or the header flickers in and out.
    if (y + layoutMeasurement.height >= contentSize.height - 4) return;
    // A little hysteresis so a finger's jitter doesn't toggle it.
    travel.current = Math.sign(dy) === Math.sign(travel.current) ? travel.current + dy : dy;
    if (travel.current > 12) setHidden(true);
    else if (travel.current < -12) setHidden(false);
  };
  const collapseStyle = useAnimatedStyle(() =>
    headerH.value
      ? { height: headerH.value * (1 - hidden.value), opacity: 1 - hidden.value }
      : {},
  );
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -headerH.value * hidden.value }],
  }));

  const [audience, setAudience] = useState<WorkAudience | undefined>();
  const [occasion, setOccasion] = useState<WorkOccasion | undefined>();
  const anyFilter = !!audience || !!occasion;

  // Search runs on what the shopper MEANS, in any of the six languages — the
  // server resolves "robe rouge" to dress + red (see parseSearchQuery). Here we
  // only debounce, and ignore a lone character that would match everything.
  const [qInput, setQInput] = useState('');
  const debouncedQ = useDebouncedValue(qInput.trim(), 300);
  const q = debouncedQ.length >= 2 ? debouncedQ : undefined;

  const filter = useMemo(() => ({ audience, occasion, q }), [audience, occasion, q]);
  const feedQ = useFeed(filter);

  const items: FeedPostPublic[] = useMemo(
    () => (feedQ.data?.pages ?? []).flatMap((p) => p.items),
    [feedQ.data],
  );
  // Set by the server when nothing matched every word and it widened to any.
  const relaxed = !!feedQ.data?.pages[0]?.relaxed;

  // ── Masonry ───────────────────────────────────────────────────────────────
  const columns = useGridColumns();
  const contentWidth = useContentWidth();
  // Columns sit at half the vertical rhythm: tiles read as one wall of work
  // rather than separate strips. The gap above/below each tile is unchanged.
  const columnGap = spacing.md / 2;
  const cellW = (contentWidth - spacing.lg * 2 - columnGap * (columns - 1)) / columns;

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
      <Animated.View style={[styles.collapse, collapseStyle]}>
        <Animated.View
          style={[styles.padded, slideStyle]}
          onLayout={(e) => {
            if (!headerH.value) headerH.value = e.nativeEvent.layout.height;
          }}
        >
          <View style={styles.brandRow}>
            {/* The real wordmark artwork — light/dark variants keep "Seam"
                legible on either canvas. */}
            <Image
              source={
                mode === 'midnight'
                  ? require('../../../assets/images/wordmark-dark.png')
                  : require('../../../assets/images/wordmark-light.png')
              }
              style={styles.wordmark}
              resizeMode="contain"
              accessibilityRole="header"
              accessibilityLabel="SeamFlow"
            />
            <View style={styles.headerActions}>
              {/* Notifications live in the header (they're not a tab). Messages
                  moved to the bottom bar. Signed-out browsers have neither, so
                  the bell only shows once there's a session. */}
              {session ? (
                <Pressable
                  onPress={() => router.push('/hub/notifications' as never)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('cnotifications.title')}
                >
                  <Ionicons name="notifications-outline" size={24} color={colors.textMuted} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => router.push((session ? '/hub' : '/sign-in') as never)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={session ? t('chome.tagline') : t('auth.signIn')}
              >
                <Ionicons
                  name={session ? 'person-circle' : 'person-circle-outline'}
                  size={28}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          </View>
          <Text variant="bodySm" tone="textMuted">
            {t('discover.subtitle')}
          </Text>
        </Animated.View>
      </Animated.View>

      <View style={styles.search}>
        <SearchField
          value={qInput}
          onChangeText={setQInput}
          placeholder={t('discover.searchPlaceholder')}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBarOuter}
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
      ) : items.length === 0 && q ? (
        // A search that found nothing is still a request: nobody has posted it,
        // so offer to have it made. The query becomes the request's description.
        <View style={styles.empty}>
          <Ionicons name="cut-outline" size={44} color={colors.textMuted} />
          <Text variant="h3" style={styles.emptyTitle}>
            {t('discover.searchNoneTitle', { q })}
          </Text>
          <Text variant="bodySm" tone="textMuted" style={styles.emptyText}>
            {t('discover.searchNoneBody')}
          </Text>
          <View style={styles.emptyCta}>
            <Button
              label={t('discover.searchAskTailors')}
              iconStart={<Ionicons name="add" size={18} color={colors.accentText} />}
              onPress={() =>
                router.push({
                  pathname: '/hub/requests/new',
                  params: { description: q },
                } as never)
              }
            />
          </View>
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
          onScroll={onGridScroll}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={() => {
            if (feedQ.hasNextPage && !feedQ.isFetchingNextPage) feedQ.fetchNextPage();
          }}
        >
          {q ? (
            <Text variant="bodySm" tone="textMuted" style={styles.resultsNote}>
              {relaxed ? t('discover.searchRelaxed', { q }) : t('discover.searchResults', { q })}
            </Text>
          ) : null}
          {/* Dimmed while a newer search is loading over the previous results. */}
          <View style={[styles.masonry, feedQ.isPlaceholderData ? styles.stale : null]}>
            {cols.map((col, ci) => (
              <View key={ci} style={{ width: cellW, gap: spacing.md }}>
                {col.map((post) => {
                  const ratio = post.width && post.height ? post.width / post.height : 1;
                  return (
                    <Pressable
                      key={post.id}
                      onPress={() =>
                        router.push({
                          pathname: '/discover/[id]',
                          params: { id: post.id },
                        })
                      }
                    >
                      {/* Attribution laid OVER the image in a gradient-blur bar
                          (same treatment as a designer's profile grid), so the
                          maker's name reads as part of the piece rather than a
                          loose caption below it. */}
                      <View
                        style={{
                          width: cellW,
                          height: cellW / ratio,
                          borderRadius: radii.md,
                          overflow: 'hidden',
                          backgroundColor: colors.card,
                        }}
                      >
                        <Image
                          source={{ uri: post.thumbnailUrl }}
                          style={{ width: cellW, height: cellW / ratio }}
                        />
                        <ImageCaption name={post.tailor.businessName} />
                      </View>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  collapse: { overflow: 'hidden' },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  // Wordmark artwork is 1201:186 (~6.45:1).
  wordmark: { width: 168, height: 26 },
  search: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  resultsNote: { marginBottom: spacing.md },
  stale: { opacity: 0.5 },
  emptyCta: { marginTop: spacing.lg },
  // alignItems keeps each chip its own height instead of stretching to the
  // row; flexGrow stops the row itself claiming the leftover column height.
  // Native hugs the content either way — on web the ScrollView takes flex:1
  // and the chips became full-height columns.
  filterBarOuter: { flexGrow: 0, flexShrink: 0 },
  filterBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: BOTTOM_CHROME_SPACE },
  masonry: { flexDirection: 'row', gap: spacing.md / 2 },
  empty: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xl * 2 },
  emptyTitle: { marginTop: spacing.md, textAlign: 'center' },
  emptyText: { textAlign: 'center', marginTop: spacing.sm },
});
