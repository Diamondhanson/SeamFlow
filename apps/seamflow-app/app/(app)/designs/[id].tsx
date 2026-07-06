import { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { AiDescribeSheet } from '../../../components/AiDescribeSheet';
import {
  useDesign,
  useUpdateDesign,
  useDeleteDesign,
  useAttachDesignToOrder,
  useOrders,
} from '../../../lib/queries';
import { spacing } from '../../../lib/theme';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { useDialog } from '../../../lib/dialog';
import { useTranslation } from '../../../lib/i18n';

export default function DesignDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, radii } = useAtelierTheme();
  const scroll = useFloatingScroll();
  const dialog = useDialog();

  const designQ = useDesign(id);
  const updateM = useUpdateDesign(id);
  const deleteM = useDeleteDesign();
  const attachM = useAttachDesignToOrder();
  const ordersQ = useOrders({});

  const design = designQ.data ?? null;
  const [caption, setCaption] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [describeOpen, setDescribeOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);

  useEffect(() => {
    if (design) {
      setCaption(design.caption ?? '');
      setTagsText((design.tags ?? []).join(', '));
    }
  }, [design]);

  const parseTags = (s: string) =>
    s.split(',').map((t) => t.trim()).filter(Boolean);

  const save = () =>
    updateM.mutate(
      { caption: caption.trim() || null, tags: parseTags(tagsText) },
      { onError: (e) => void dialog.error(e) },
    );

  const onAcceptDescription = (res: { text: string; tags?: string[] }) => {
    // Fold AI text into the caption (if empty) and merge any tags in.
    const nextCaption = caption.trim() || res.text;
    const merged = Array.from(new Set([...parseTags(tagsText), ...(res.tags ?? [])]));
    setCaption(nextCaption);
    setTagsText(merged.join(', '));
    updateM.mutate({
      caption: nextCaption.trim() || null,
      tags: merged,
      aiNotes: res.text,
    });
  };

  const attach = (orderId: string) => {
    setAttachOpen(false);
    attachM.mutate(
      { designId: id, orderId },
      {
        onSuccess: () =>
          void dialog.alert({
            title: t('designs.attachedTitle'),
            message: t('designs.attachedBody'),
            tone: 'success',
          }),
        onError: (e) => void dialog.error(e),
      },
    );
  };

  const confirmDelete = async () => {
    const ok = await dialog.confirm({
      title: t('designs.deleteConfirmTitle'),
      message: t('designs.deleteConfirmBody'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;
    deleteM.mutate(id, {
      onSuccess: () => router.back(),
      onError: (e) => void dialog.error(e),
    });
  };

  if (!design) {
    return (
      <Screen>
        <ScreenHeader title={t('designs.designTitle')} />
        <Text variant="bodySm" tone="textMuted">{t('common.loading')}</Text>
      </Screen>
    );
  }

  const url = design.signedUrl ?? design.thumbnailUrl;

  return (
    <Screen>
      <ScreenHeader title={t('designs.inspirationTitle')} />
      <ScrollView {...scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 }}>
        {url ? (
          <Image
            source={{ uri: url }}
            style={[styles.hero, { backgroundColor: colors.surface, borderRadius: radii.l }]}
            resizeMode="cover"
          />
        ) : null}

        <View style={styles.actionsRow}>
          <Button
            label={t('designs.autoDescribe')}
            variant="secondary"
            size="sm"
            fullWidth={false}
            iconLeft={<Ionicons name="sparkles-outline" size={16} color={colors.text} />}
            onPress={() => setDescribeOpen(true)}
          />
          <Button
            label={t('designs.attachToOrder')}
            variant="secondary"
            size="sm"
            fullWidth={false}
            iconLeft={<Ionicons name="link-outline" size={16} color={colors.text} />}
            onPress={() => setAttachOpen(true)}
          />
        </View>

        <Input label={t('designs.captionLabel')} value={caption} onChangeText={setCaption} placeholder={t('designs.captionPlaceholder')} multiline />
        <Input label={t('designs.tagsLabel')} value={tagsText} onChangeText={setTagsText} placeholder={t('designs.tagsPlaceholder')} autoCapitalize="none" />
        <Button label={t('common.save')} onPress={save} loading={updateM.isPending} />

        <View style={{ height: spacing.lg }} />
        <Button label={t('common.delete')} variant="danger" onPress={confirmDelete} loading={deleteM.isPending} />
      </ScrollView>

      <AiDescribeSheet
        visible={describeOpen}
        onClose={() => setDescribeOpen(false)}
        imageUrl={design.thumbnailUrl ?? design.signedUrl}
        storagePath={design.storagePath}
        onAccept={onAcceptDescription}
      />

      {/* Order picker for attach-to-order (M2). */}
      <Modal visible={attachOpen} animationType="slide" transparent onRequestClose={() => setAttachOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
            <View style={styles.sheetHead}>
              <Text variant="h3">{t('designs.attachToOrder')}</Text>
              <Pressable onPress={() => setAttachOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <FlatList
              data={ordersQ.data?.items ?? []}
              keyExtractor={(o) => o.id}
              style={{ flex: 1 }}
              ListEmptyComponent={
                <Text variant="bodySm" tone="textMuted" style={{ textAlign: 'center', marginTop: spacing.xl }}>
                  {t('designs.noOrders')}
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.orderRow, { borderBottomColor: colors.hairline }]}
                  onPress={() => attach(item.id)}
                >
                  <Text variant="body" numberOfLines={1}>{item.orderName}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', aspectRatio: 1, marginBottom: spacing.md },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    width: '95%',
    maxWidth: 640,
    maxHeight: '85%',
    borderRadius: 24,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
});
