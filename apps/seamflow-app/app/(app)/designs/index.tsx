import { useCallback, useState } from 'react';
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
import type { Design } from '@seamflow/schemas';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { DesignViewer } from '../../../components/DesignViewer';
import { SkeletonGrid } from '../../../components/Skeleton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { HelpCard } from '../../../components/HelpCard';
import { useDesigns, useMe } from '../../../lib/queries';
import { pickPhoto, uploadDesign } from '../../../lib/photo-upload';
import { alertIfOffline, alertIfPermissionDenied } from '../../../lib/permissions';
import { useDialog } from '../../../lib/dialog';
import { qk } from '../../../lib/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import { spacing } from '../../../lib/theme';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { useTranslation } from '../../../lib/i18n';
import { useGridColumns, useContentWidth } from '../../../lib/use-breakpoint';

export default function DesignStudio() {
  const { t } = useTranslation();
  const { colors, radii } = useAtelierTheme();
  const qc = useQueryClient();
  const dialog = useDialog();
  const scroll = useFloatingScroll();
  const { data: me } = useMe();
  const designsQ = useDesigns();
  const [uploading, setUploading] = useState(false);

  const items = designsQ.data?.items ?? [];
  const tailorId = me?.tailor?.id;

  // Fullscreen preview: tap a tile → viewer at that image; swipe l/r to browse,
  // swipe down / ✕ to return. Details now open from the viewer's pencil button.
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Responsive masonry: 2 cols (phone) → 3 (medium) → 4 (expanded). Cell width
  // is computed from the same wide content width the <Screen> uses.
  const columns = useGridColumns();
  const contentW = useContentWidth('wide');
  const cellW = Math.floor(
    (contentW - spacing.lg * 2 - spacing.md * (columns - 1)) / columns,
  );

  // Pinterest-style layout: each image keeps its own aspect ratio. Ratios come
  // from the image itself as it loads (no extra network fetch); until then a
  // square placeholder holds the spot, and the column reflows on load.
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const onImgLoad = useCallback(
    (id: string, w: number, h: number) => {
      if (!w || !h) return;
      // Clamp so one extreme panorama/strip can't wreck the column rhythm.
      const ratio = Math.min(Math.max(w / h, 0.55), 1.9);
      setRatios((prev) => (prev[id] ? prev : { ...prev, [id]: ratio }));
    },
    [],
  );

  // Greedy shortest-column packing — keeps column bottoms roughly level.
  const cols: Design[][] = Array.from({ length: columns }, () => []);
  const heights = new Array(columns).fill(0);
  for (const item of items) {
    const ratio = ratios[item.id] ?? 1;
    const cellH = cellW / ratio + (item.caption ? 22 : 0) + spacing.md;
    const shortest = heights.indexOf(Math.min(...heights));
    cols[shortest].push(item);
    heights[shortest] += cellH;
  }

  const add = async (source: 'camera' | 'library') => {
    if (!tailorId) {
      await dialog.alert({
        title: t('designs.finishSetupTitle'),
        message: t('designs.finishSetupBody'),
        tone: 'info',
      });
      return;
    }
    setUploading(true);
    try {
      const asset = await pickPhoto(source);
      if (!asset) return;
      await uploadDesign({ tailorId, asset });
      qc.invalidateQueries({ queryKey: qk.designs() });
    } catch (err) {
      if (
        !(await alertIfOffline(err, dialog, t)) &&
        !(await alertIfPermissionDenied(err, dialog, t))
      ) {
        await dialog.error(err);
      }
    } finally {
      setUploading(false);
    }
  };

  const promptAdd = async () => {
    const action = await dialog.choose<'camera' | 'library'>({
      title: t('designs.addSourceTitle'),
      actions: [
        { label: t('designs.takePhoto'), value: 'camera' },
        { label: t('designs.chooseFromGallery'), value: 'library' },
      ],
    });
    if (action) add(action);
  };

  return (
    <Screen padded={false} width="wide">
      <View style={styles.padded}>
        <ScreenHeader
          title={t('designs.studioTitle')}
          right={
            <Pressable
              onPress={promptAdd}
              disabled={uploading}
              accessibilityLabel={t('designs.addA11yLabel')}
              style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: radii.pill }]}
            >
              {uploading ? (
                <ActivityIndicator color={colors.textOnPrimary} size="small" />
              ) : (
                <Ionicons name="add" size={24} color={colors.textOnPrimary} />
              )}
            </Pressable>
          }
        />
        <Text variant="bodySm" tone="textMuted">
          {t('designs.subtitle')}
        </Text>
        <HelpCard
          guideKey="flow.designs"
          title={t('guides.designsTitle')}
          message={t('guides.designsBody')}
          style={{ marginTop: spacing.md }}
        />
      </View>

      {designsQ.isLoading && items.length === 0 ? (
        <View style={styles.skeletonWrap}>
          <SkeletonGrid columns={3} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="color-palette-outline" size={40} color={colors.textMuted} />
          <Text variant="body" tone="textMuted" style={styles.emptyText}>
            {t('designs.emptyState')}
          </Text>
        </View>
      ) : (
        <ScrollView
          {...scroll}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.masonry}>
            {cols.map((col, ci) => (
              <View key={ci} style={{ width: cellW, gap: spacing.md }}>
                {col.map((item) => {
                  const url = item.thumbnailUrl ?? item.signedUrl;
                  const ratio = ratios[item.id] ?? 1;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setViewerIndex(items.indexOf(item))}
                    >
                      {url ? (
                        <Image
                          source={{ uri: url }}
                          onLoad={(e) =>
                            onImgLoad(
                              item.id,
                              e.nativeEvent.source?.width ?? 0,
                              e.nativeEvent.source?.height ?? 0,
                            )
                          }
                          style={[
                            styles.thumb,
                            { aspectRatio: ratio, backgroundColor: colors.surface, borderRadius: radii.l },
                          ]}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.thumb,
                            styles.thumbPlaceholder,
                            { aspectRatio: 1, backgroundColor: colors.surface, borderRadius: radii.l },
                          ]}
                        >
                          <ActivityIndicator color={colors.textMuted} />
                        </View>
                      )}
                      {item.caption ? (
                        <Text variant="caption" tone="textMuted" numberOfLines={1} style={styles.caption}>
                          {item.caption}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <DesignViewer
        items={items}
        initialIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onOpenDetails={(id) => {
          setViewerIndex(null);
          router.push(`/(app)/designs/${id}`);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  addBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  muted: { textAlign: 'center', marginTop: spacing.xl },
  skeletonWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  empty: { alignItems: 'center', marginTop: spacing.xl * 2, paddingHorizontal: spacing.xl, gap: spacing.md },
  emptyText: { textAlign: 'center' },
  grid: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 96 },
  masonry: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  thumb: { width: '100%' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  caption: { marginTop: 4 },
});
