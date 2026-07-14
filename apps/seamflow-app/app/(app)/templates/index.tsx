import { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { MeasurementTemplate } from '@seamflow/schemas';
import {
  Text,
  Chip,
  ListRow,
  IconButton,
  useAtelierTheme,
} from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { SkeletonList } from '../../../components/Skeleton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { HelpCard } from '../../../components/HelpCard';
import { api, ApiError } from '../../../lib/api';
import { spacing } from '../../../lib/theme';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { useTranslation } from '../../../lib/i18n';
import { useResponsiveValue, useContentWidth } from '../../../lib/use-breakpoint';
import { useDialog } from '../../../lib/dialog';

// Quick-start garments. Each opens the new-template form (passing the garment
// so the form can pre-fill it once it reads the param).
const STARTERS = ['Agbada', 'Suit', 'Lehenga', 'Abaya', 'Kaftan', 'Gown'];

export default function TemplatesList() {
  const [items, setItems] = useState<MeasurementTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useAtelierTheme();
  const scroll = useFloatingScroll();
  const { t } = useTranslation();
  const dialog = useDialog();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.measurementTemplates.list();
      setItems(res.items);
    } catch (err) {
      if (err instanceof ApiError && err.isNotFound()) {
        if (
          await dialog.confirm({
            title: t('templates.profileRequiredTitle'),
            message: t('templates.profileRequiredBody'),
            confirmLabel: t('templates.profileAction'),
          })
        )
          router.push('/(app)/me');
      } else {
        await dialog.error(err);
      }
    } finally {
      setLoading(false);
    }
  }, [t, dialog]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const starterSection = (
    <View style={styles.starter}>
      <Text variant="label" tone="textMuted">
        {t('templates.starterHeading')}
      </Text>
      <Text variant="bodySm" tone="textMuted" style={{ marginTop: 4, marginBottom: spacing.md }}>
        {t('templates.starterHelp')}
      </Text>
      <View style={styles.starterChips}>
        {STARTERS.map((g) => (
          <Chip
            key={g}
            label={`+ ${g}`}
            tone="primary"
            onPress={() =>
              router.push({
                pathname: '/(app)/templates/new',
                params: { garment: g },
              })
            }
          />
        ))}
      </View>
    </View>
  );

  const columns = useResponsiveValue({ compact: 1, medium: 2, expanded: 2 });
  const contentW = useContentWidth('wide');
  const cellW =
    columns > 1
      ? Math.floor((contentW - spacing.lg * 2 - spacing.md * (columns - 1)) / columns)
      : undefined;

  return (
    <Screen padded={false} width="wide">
      <View style={styles.padded}>
        <ScreenHeader
          title={t('templates.listTitle')}
          subtitle={t('templates.listSubtitle')}
          right={
            <IconButton
              variant="primary"
              onPress={() => router.push('/(app)/templates/new')}
              accessibilityLabel={t('templates.newTemplate')}
            >
              <Ionicons name="add" size={24} color={colors.textOnPrimary} />
            </IconButton>
          }
        />
        <HelpCard
          guideKey="flow.templates"
          title={t('guides.templatesTitle')}
          message={t('guides.templatesBody')}
        />
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.skeletonWrap}>
          <SkeletonList leading="square" />
        </View>
      ) : (
        <FlatList
          {...scroll}
          data={items}
          keyExtractor={(t) => t.id}
          key={`list-${columns}`}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.rowWrap : undefined}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text variant="bodySm" tone="textMuted" style={styles.muted}>
              {t('templates.empty')}
            </Text>
          }
          ListFooterComponent={starterSection}
          renderItem={({ item }) => (
            <View style={cellW ? { width: cellW } : undefined}>
              <ListRow
                title={item.name}
                subtitle={t(
                  item.fields.length === 1 ? 'templates.fieldCount' : 'templates.fieldCount_plural',
                  { count: item.fields.length },
                )}
                subtitleNumeric
                leading={
                  item.images[0]?.thumbnailUrl ? (
                    <Image
                      source={{ uri: item.images[0].thumbnailUrl }}
                      style={styles.leadingThumb}
                    />
                  ) : (
                    <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                  )
                }
                onPress={() => router.push(`/(app)/templates/${item.id}`)}
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
  starter: { marginTop: spacing.xl },
  starterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
