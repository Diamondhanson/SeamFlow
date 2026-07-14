import { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@seamflow/utils';
import type { FabricResponse } from '@seamflow/schemas';
import { Text, ListRow, IconButton, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { HelpCard } from '../../../components/HelpCard';
import { Input } from '../../../components/Input';
import { SkeletonList } from '../../../components/Skeleton';
import { useFabrics, useMe } from '../../../lib/queries';
import { spacing } from '../../../lib/theme';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { useTranslation } from '../../../lib/i18n';
import { useDebouncedValue } from '../../../lib/use-debounced-value';
import { useResponsiveValue, useContentWidth } from '../../../lib/use-breakpoint';

export default function FabricsList() {
  const { data, isLoading, refetch } = useFabrics();
  // Refresh when returning from create / edit / delete so the list is current.
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));
  const { data: me } = useMe();
  const currency = me?.tailor?.currency ?? null;
  const { colors } = useAtelierTheme();
  const scroll = useFloatingScroll();
  const { t } = useTranslation();

  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim().toLowerCase(), 200);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    if (!q) return all;
    return all.filter((f) =>
      [f.name, f.color, f.supplier, f.composition]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [data?.items, q]);

  const columns = useResponsiveValue({ compact: 1, medium: 2, expanded: 2 });
  const contentW = useContentWidth('wide');
  const cellW =
    columns > 1
      ? Math.floor((contentW - spacing.lg * 2 - spacing.md * (columns - 1)) / columns)
      : undefined;

  const subtitle = (f: FabricResponse): string => {
    const bits: string[] = [];
    if (f.color) bits.push(f.color);
    if (f.costPerMeter != null && currency) {
      bits.push(t('fabrics.perMeter', { price: formatCurrency(Number(f.costPerMeter), currency) }));
    }
    if (f.yardageMeters != null) {
      bits.push(t('fabrics.metersLeft', { count: Number(f.yardageMeters) }));
    }
    return bits.join('  ·  ') || t('fabrics.unnamedColor');
  };

  return (
    <Screen padded={false} width="wide">
      <View style={styles.padded}>
        <ScreenHeader
          title={t('fabrics.listTitle')}
          subtitle={t('fabrics.listSubtitle')}
          right={
            <IconButton
              variant="primary"
              onPress={() => router.push('/(app)/fabrics/new')}
              accessibilityLabel={t('fabrics.newFabric')}
            >
              <Ionicons name="add" size={24} color={colors.textOnPrimary} />
            </IconButton>
          }
        />
        {(data?.items.length ?? 0) > 0 ? (
          <Input
            label={t('fabrics.searchPlaceholder')}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        ) : null}
        <HelpCard
          guideKey="flow.fabrics"
          title={t('guides.fabricsTitle')}
          message={t('guides.fabricsBody')}
        />
      </View>

      {isLoading && !data ? (
        <View style={styles.skeletonWrap}>
          <SkeletonList leading="square" />
        </View>
      ) : (
        <FlatList
          {...scroll}
          data={items}
          keyExtractor={(f) => f.id}
          key={`list-${columns}`}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.rowWrap : undefined}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text variant="bodySm" tone="textMuted" style={styles.muted}>
              {q ? t('fabrics.noMatches') : t('fabrics.empty')}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={cellW ? { width: cellW } : undefined}>
              <ListRow
                title={item.name}
                subtitle={subtitle(item)}
                leading={
                  item.photoThumbUrl ?? item.photoUrl ? (
                    <Image
                      source={{ uri: item.photoThumbUrl ?? item.photoUrl! }}
                      style={styles.leadingThumb}
                    />
                  ) : (
                    <Ionicons name="layers-outline" size={20} color={colors.primary} />
                  )
                }
                onPress={() => router.push(`/(app)/fabrics/${item.id}`)}
              />
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 96,
    rowGap: spacing.md,
  },
  rowWrap: { gap: spacing.md },
  leadingThumb: { width: 44, height: 44, borderRadius: 10 },
  muted: { textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  skeletonWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
