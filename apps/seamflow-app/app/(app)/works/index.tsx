// ============================================================================
// "My Designs" — the tailor's portfolio of work they actually MADE.
//
// Deliberately NOT the Design Studio. That screen holds inspiration collected
// from elsewhere; this one holds their own finished pieces, and it is the only
// place work can be pushed into the public discovery feed.
//
// The two screens share a masonry look on purpose — it's the same "look at
// pictures" mental model — but the actions differ completely: Design Studio
// describes and attaches to orders, this one classifies and publishes.
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
import type { Work, WorkAudience, WorkOccasion } from '@seamflow/schemas';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonGrid } from '../../../components/Skeleton';
import { HelpCard } from '../../../components/HelpCard';
import {
  useMe,
  usePublishWork,
  useUnpublishWork,
  useDeleteWork,
  useWorkFacets,
  useWorks,
} from '../../../lib/queries';
import { MAX_MULTI_SELECT, pickPhotos, uploadWork } from '../../../lib/photo-upload';
import { alertIfOffline, alertIfPermissionDenied } from '../../../lib/permissions';
import { useDialog } from '../../../lib/dialog';
import { useShareCatalogue } from '../../../lib/share-catalogue';
import { useQueryClient } from '@tanstack/react-query';
import { useGridColumns, useContentWidth } from '../../../lib/use-breakpoint';
import { spacing, radii, useThemeColors } from '../../../lib/theme';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { useTranslation } from '../../../lib/i18n';

type PublishedFilter = 'all' | 'published' | 'unpublished';

export default function MyDesigns() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const dialog = useDialog();
  const scroll = useFloatingScroll();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const tailorId = me?.tailor?.id;
  const shareCatalogue = useShareCatalogue();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [garmentType, setGarmentType] = useState<string | undefined>();
  const [audience, setAudience] = useState<WorkAudience | undefined>();
  const [fabric, setFabric] = useState<string | undefined>();
  const [occasion, setOccasion] = useState<WorkOccasion | undefined>();
  const [published, setPublished] = useState<PublishedFilter>('all');

  const filter = useMemo(
    () => ({
      garmentType,
      audience,
      fabric,
      occasion,
      published: published === 'all' ? undefined : published,
    }),
    [garmentType, audience, fabric, occasion, published],
  );
  const anyFilter =
    !!garmentType || !!audience || !!fabric || !!occasion || published !== 'all';

  const worksQ = useWorks(filter);
  const facetsQ = useWorkFacets();
  const publishM = usePublishWork();
  const unpublishM = useUnpublishWork();
  const deleteM = useDeleteWork();

  const items: Work[] = useMemo(
    () => (worksQ.data?.pages ?? []).flatMap((p) => p.items),
    [worksQ.data],
  );
  const facets = facetsQ.data;

  // ── Upload ────────────────────────────────────────────────────────────────
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  const add = async (source: 'camera' | 'library') => {
    if (!tailorId) return;
    setUploading(true);
    try {
      const assets = await pickPhotos(source, MAX_MULTI_SELECT);
      if (assets.length === 0) return;
      // Sequential for the same reason as the Design Studio: encoding ten
      // images at once spikes memory enough to stall a mid-range phone.
      let failed = 0;
      for (let i = 0; i < assets.length; i++) {
        setProgress({ done: i + 1, total: assets.length });
        try {
          await uploadWork({ tailorId, asset: assets[i]! });
        } catch {
          failed++;
        }
      }
      qc.invalidateQueries({ queryKey: ['works'] });
      if (failed > 0 && failed === assets.length) {
        await dialog.error(new Error(t('designs.describeError')));
      }
    } catch (err) {
      if (
        !(await alertIfOffline(err, dialog, t)) &&
        !(await alertIfPermissionDenied(err, dialog, t))
      ) {
        await dialog.error(err);
      }
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const promptAdd = async () => {
    const action = await dialog.choose<'camera' | 'library'>({
      title: t('feed.worksAdd'),
      actions: [
        { label: t('designs.takePhoto'), value: 'camera' },
        {
          label: t('designs.chooseFromGalleryMulti', { max: MAX_MULTI_SELECT }),
          value: 'library',
        },
      ],
    });
    if (action) add(action);
  };

  // ── Per-item actions ──────────────────────────────────────────────────────
  const itemActions = async (work: Work) => {
    const action = await dialog.choose<'toggle' | 'edit' | 'delete'>({
      title: work.title || t('feed.worksTitle'),
      actions: [
        {
          label: work.isPublished ? t('feed.unpublishAction') : t('feed.publishAction'),
          value: 'toggle',
        },
        { label: t('feed.editDesign'), value: 'edit' },
        { label: t('feed.deleteDesign'), value: 'delete', destructive: true },
      ],
    });
    if (!action) return;

    if (action === 'edit') {
      router.push({ pathname: '/(app)/works/[id]', params: { id: work.id } });
      return;
    }
    if (action === 'toggle') {
      const onError = (err: unknown) => void dialog.error(err);
      if (work.isPublished) {
        unpublishM.mutate(work.id, { onError });
      } else {
        publishM.mutate({ id: work.id, input: {} }, { onError });
      }
      return;
    }

    const ok = await dialog.confirm({
      title: t('feed.deleteConfirmTitle'),
      message: t('feed.deleteConfirmBody'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;
    deleteM.mutate(work.id, { onError: (err) => void dialog.error(err) });
  };

  // ── Masonry layout ────────────────────────────────────────────────────────
  const columns = useGridColumns();
  const contentWidth = useContentWidth();
  const gap = spacing.md;
  const cellW = (contentWidth - spacing.lg * 2 - gap * (columns - 1)) / columns;

  const cols: Work[][] = Array.from({ length: columns }, () => []);
  const heights = new Array(columns).fill(0);
  for (const item of items) {
    // Ratio from the stored dimensions so the grid never reflows on load.
    const ratio = item.width && item.height ? item.width / item.height : 1;
    const cellH = cellW / ratio + (item.title ? 22 : 0) + spacing.md;
    const shortest = heights.indexOf(Math.min(...heights));
    cols[shortest]!.push(item);
    heights[shortest] += cellH;
  }

  const clearFilters = () => {
    setGarmentType(undefined);
    setAudience(undefined);
    setFabric(undefined);
    setOccasion(undefined);
    setPublished('all');
  };

  return (
    <Screen padded={false} width="wide">
      <View style={styles.padded}>
        <ScreenHeader
          title={t('feed.worksTitle')}
          right={
            <View style={styles.headerActions}>
              {/* Share sits beside Add rather than in a menu: this is the
                  screen a tailor is on when they think "let me send people my
                  work", and burying it one tap deeper is what stops it being
                  used. Secondary styling keeps Add the primary action. */}
              <Pressable
                onPress={() =>
                  void shareCatalogue.share({
                    tailorBusinessName: me?.tailor?.businessName ?? 'SeamFlow',
                  })
                }
                disabled={shareCatalogue.isPending}
                accessibilityLabel={t('feed.shareCatalogue')}
                style={[styles.addBtn, { backgroundColor: colors.card, borderRadius: radii.lg }]}
              >
                {shareCatalogue.isPending ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Ionicons name="share-social-outline" size={22} color={colors.text} />
                )}
              </Pressable>
              <Pressable
                onPress={promptAdd}
                disabled={uploading}
                accessibilityLabel={t('feed.worksAdd')}
                style={[styles.addBtn, { backgroundColor: colors.accent, borderRadius: radii.lg }]}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.accentText} />
                ) : (
                  <Ionicons name="add" size={24} color={colors.accentText} />
                )}
              </Pressable>
            </View>
          }
        />
        <Text variant="bodySm" tone="textMuted">
          {t('feed.worksSubtitle')}
        </Text>
        {progress && progress.total > 1 ? (
          <Text variant="bodySm" style={{ color: colors.accent, marginTop: spacing.xs }}>
            {t('feed.worksUploading', { done: progress.done, total: progress.total })}
          </Text>
        ) : null}
        {facets ? (
          <Text variant="caption" tone="textMuted" style={{ marginTop: spacing.xs }}>
            {t('feed.worksCount', {
              count: facets.total,
              published: facets.publishedCount,
            })}
          </Text>
        ) : null}
        <HelpCard
          guideKey="flow.works"
          title={t('feed.worksTitle')}
          message={t('feed.worksEmptyBody')}
          style={{ marginTop: spacing.md }}
        />
      </View>

      {/* Filter bar. Chips are built from facets, so we never offer a filter
          that would return an empty grid. */}
      {facets && facets.total > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          <FilterChip
            label={t('feed.publishedFilter')}
            active={published === 'published'}
            onPress={() => setPublished(published === 'published' ? 'all' : 'published')}
          />
          <FilterChip
            label={t('feed.unpublishedFilter')}
            active={published === 'unpublished'}
            onPress={() =>
              setPublished(published === 'unpublished' ? 'all' : 'unpublished')
            }
          />
          {facets.audiences.map((a) => (
            <FilterChip
              key={a}
              label={t(`feed.audience_${a}`)}
              active={audience === a}
              onPress={() => setAudience(audience === a ? undefined : a)}
            />
          ))}
          {facets.occasions.map((o) => (
            <FilterChip
              key={o}
              label={t(`feed.occasion_${o}`)}
              active={occasion === o}
              onPress={() => setOccasion(occasion === o ? undefined : o)}
            />
          ))}
          {facets.garmentTypes.map((g) => (
            <FilterChip
              key={g}
              label={g}
              active={garmentType === g}
              onPress={() => setGarmentType(garmentType === g ? undefined : g)}
            />
          ))}
          {facets.fabrics.map((f) => (
            <FilterChip
              key={f}
              label={f}
              active={fabric === f}
              onPress={() => setFabric(fabric === f ? undefined : f)}
            />
          ))}
          {anyFilter ? (
            <FilterChip label={t('feed.clearFilters')} active={false} onPress={clearFilters} />
          ) : null}
        </ScrollView>
      ) : null}

      {worksQ.isLoading && items.length === 0 ? (
        <View style={styles.padded}>
          <SkeletonGrid columns={columns} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="shirt-outline" size={40} color={colors.textMuted} />
          <Text variant="body" tone="textMuted" style={styles.emptyText}>
            {anyFilter ? t('feed.noMatch') : t('feed.worksEmptyBody')}
          </Text>
        </View>
      ) : (
        <ScrollView
          {...scroll}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={() => {
            if (worksQ.hasNextPage && !worksQ.isFetchingNextPage) worksQ.fetchNextPage();
          }}
        >
          <View style={styles.masonry}>
            {cols.map((col, ci) => (
              <View key={ci} style={{ width: cellW, gap: spacing.md }}>
                {col.map((item) => {
                  const ratio = item.width && item.height ? item.width / item.height : 1;
                  return (
                    <Pressable key={item.id} onPress={() => itemActions(item)}>
                      {item.thumbnailUrl ?? item.signedUrl ? (
                        <Image
                          source={{ uri: item.thumbnailUrl ?? item.signedUrl }}
                          style={{
                            width: cellW,
                            height: cellW / ratio,
                            backgroundColor: colors.card,
                            borderRadius: radii.md,
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: cellW,
                            height: cellW,
                            backgroundColor: colors.card,
                            borderRadius: radii.md,
                          }}
                        />
                      )}
                      {item.isPublished ? (
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: colors.accent, borderRadius: radii.lg },
                          ]}
                        >
                          <Text variant="caption" style={{ color: colors.accentText }}>
                            {t('feed.inFeedBadge')}
                          </Text>
                        </View>
                      ) : null}
                      {item.title ? (
                        <Text variant="caption" tone="textMuted" numberOfLines={1}>
                          {item.title}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
          {worksQ.isFetchingNextPage ? (
            <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.textMuted} />
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

function FilterChip({
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
        {
          backgroundColor: active ? colors.accent : colors.card,
          borderRadius: radii.lg,
        },
      ]}
    >
      <Text variant="bodySm" style={{ color: active ? colors.accentText : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  addBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filterBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  masonry: { flexDirection: 'row', gap: spacing.md },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  empty: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xl * 2 },
  emptyText: { textAlign: 'center', marginTop: spacing.md },
});
