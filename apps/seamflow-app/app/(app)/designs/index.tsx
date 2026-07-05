import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useDesigns, useMe } from '../../../lib/queries';
import { pickPhoto, uploadDesign } from '../../../lib/photo-upload';
import { alertIfPermissionDenied } from '../../../lib/permissions';
import { qk } from '../../../lib/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import { spacing } from '../../../lib/theme';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { useTranslation } from '../../../lib/i18n';

export default function DesignStudio() {
  const { t } = useTranslation();
  const { colors, radii } = useAtelierTheme();
  const qc = useQueryClient();
  const scroll = useFloatingScroll();
  const { data: me } = useMe();
  const designsQ = useDesigns();
  const [uploading, setUploading] = useState(false);

  const items = designsQ.data?.items ?? [];
  const tailorId = me?.tailor?.id;

  const add = async (source: 'camera' | 'library') => {
    if (!tailorId) {
      Alert.alert(t('designs.finishSetupTitle'), t('designs.finishSetupBody'));
      return;
    }
    setUploading(true);
    try {
      const asset = await pickPhoto(source);
      if (!asset) return;
      await uploadDesign({ tailorId, asset });
      qc.invalidateQueries({ queryKey: qk.designs() });
    } catch (err) {
      if (!alertIfPermissionDenied(err, t)) {
        Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err));
      }
    } finally {
      setUploading(false);
    }
  };

  const promptAdd = () =>
    Alert.alert(t('designs.addSourceTitle'), undefined, [
      { text: t('designs.takePhoto'), onPress: () => add('camera') },
      { text: t('designs.chooseFromGallery'), onPress: () => add('library') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  return (
    <Screen padded={false}>
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
      </View>

      {designsQ.isLoading && items.length === 0 ? (
        <Text variant="bodySm" tone="textMuted" style={styles.muted}>{t('common.loading')}</Text>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="color-palette-outline" size={40} color={colors.textMuted} />
          <Text variant="body" tone="textMuted" style={styles.emptyText}>
            {t('designs.emptyState')}
          </Text>
        </View>
      ) : (
        <FlatList
          {...scroll}
          data={items}
          keyExtractor={(d) => d.id}
          numColumns={2}
          columnWrapperStyle={styles.rowWrap}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const url = item.thumbnailUrl ?? item.signedUrl;
            return (
              <Pressable
                style={styles.cell}
                onPress={() => router.push(`/(app)/designs/${item.id}`)}
              >
                {url ? (
                  <Image
                    source={{ uri: url }}
                    style={[styles.thumb, { backgroundColor: colors.surface, borderRadius: radii.l }]}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.surface, borderRadius: radii.l }]}
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
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  addBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  muted: { textAlign: 'center', marginTop: spacing.xl },
  empty: { alignItems: 'center', marginTop: spacing.xl * 2, paddingHorizontal: spacing.xl, gap: spacing.md },
  emptyText: { textAlign: 'center' },
  grid: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 96 },
  rowWrap: { gap: spacing.md },
  cell: { flex: 1, marginBottom: spacing.md },
  thumb: { width: '100%', aspectRatio: 1 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  caption: { marginTop: 4 },
});
