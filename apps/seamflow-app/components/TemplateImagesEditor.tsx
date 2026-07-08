// ============================================================================
// <TemplateImagesEditor> — attach optional reference images / stencils to a
// measurement template. A horizontal strip of thumbnails + an "add" tile.
// Tap a thumbnail to view it full-screen; tap the × to remove.
//
// Used by the template create form (new.tsx) and the detail screen ([id].tsx).
// The parent owns the array; this component handles pick → upload → onChange.
// Entries carry a local `previewUri` right after upload (before the server
// hands back a signed URL), so a freshly-added image shows immediately.
// ============================================================================

import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import type { TemplateImageInput } from '@seamflow/schemas';
import { pickPhoto, uploadTemplateImage } from '../lib/photo-upload';
import { alertIfOffline, alertIfPermissionDenied } from '../lib/permissions';
import { useDialog } from '../lib/dialog';
import { useTranslation } from '../lib/i18n';
import { radii, spacing } from '../lib/theme';

export interface EditableTemplateImage extends TemplateImageInput {
  /** Signed URLs from the API (existing images). */
  signedUrl?: string;
  thumbnailUrl?: string;
  /** Local asset uri, set right after upload before a signed URL exists. */
  previewUri?: string;
}

/** Strip the display-only fields — what create/update should persist. */
export function toTemplateImageInput(img: EditableTemplateImage): TemplateImageInput {
  return {
    id: img.id,
    storagePath: img.storagePath,
    thumbnailPath: img.thumbnailPath ?? null,
    contentType: img.contentType ?? null,
  };
}

export function TemplateImagesEditor({
  tailorId,
  images,
  onChange,
}: {
  tailorId: string | undefined;
  images: EditableTemplateImage[];
  onChange: (next: EditableTemplateImage[]) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const dialog = useDialog();
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);

  const add = async (source: 'camera' | 'library') => {
    if (!tailorId) return;
    setUploading(true);
    try {
      const asset = await pickPhoto(source);
      if (!asset) return;
      const meta = await uploadTemplateImage({ tailorId, asset });
      onChange([...images, { ...meta, previewUri: asset.uri }]);
    } catch (err) {
      if (
        !(await alertIfOffline(err, dialog, t)) &&
        !(await alertIfPermissionDenied(err, dialog, t))
      )
        await dialog.error(err);
    } finally {
      setUploading(false);
    }
  };

  const promptAdd = async () => {
    const action = await dialog.choose<'camera' | 'library'>({
      title: t('templates.addImageSourceTitle'),
      actions: [
        { label: t('templates.takePhoto'), value: 'camera' },
        { label: t('templates.chooseFromGallery'), value: 'library' },
      ],
    });
    if (action) add(action);
  };

  const remove = async (id: string) => {
    const ok = await dialog.confirm({
      title: t('templates.removeImageTitle'),
      message: t('templates.removeImageBody'),
      confirmLabel: t('common.remove'),
      destructive: true,
    });
    if (!ok) return;
    onChange(images.filter((i) => i.id !== id));
  };

  const thumbUri = (img: EditableTemplateImage) =>
    img.thumbnailUrl ?? img.previewUri ?? img.signedUrl;
  const fullUri = (img: EditableTemplateImage) =>
    img.signedUrl ?? img.previewUri ?? img.thumbnailUrl;

  return (
    <View>
      <Text variant="h3">{t('templates.referenceImagesLabel')}</Text>
      <Text variant="bodySm" tone="textMuted" style={styles.help}>
        {t('templates.referenceImagesHelp')}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {images.map((img) => {
          const uri = thumbUri(img);
          return (
            <View key={img.id} style={styles.thumbWrap}>
              <Pressable onPress={() => setViewer(fullUri(img) ?? null)}>
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={[styles.thumb, { backgroundColor: colors.surface }]}
                  />
                ) : (
                  <View style={[styles.thumb, styles.center, { backgroundColor: colors.surface }]}>
                    <ActivityIndicator color={colors.textMuted} />
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => remove(img.id)}
                hitSlop={8}
                accessibilityLabel={t('templates.removeImageTitle')}
                style={[styles.removeBadge, { backgroundColor: colors.scrim }]}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          );
        })}

        <Pressable
          onPress={promptAdd}
          disabled={uploading || !tailorId}
          accessibilityRole="button"
          accessibilityLabel={t('templates.addImageSourceTitle')}
          style={[styles.addTile, { borderColor: colors.border }]}
        >
          {uploading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Ionicons name="add" size={28} color={colors.textMuted} />
          )}
        </Pressable>
      </ScrollView>

      <Modal visible={viewer !== null} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={[styles.viewerBackdrop, { backgroundColor: colors.scrim }]} onPress={() => setViewer(null)}>
          {viewer ? <Image source={{ uri: viewer }} style={styles.viewerImage} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const THUMB = 104;

const styles = StyleSheet.create({
  help: { marginTop: 2, marginBottom: spacing.md },
  strip: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.xs },
  thumbWrap: { width: THUMB },
  thumb: { width: THUMB, height: THUMB, borderRadius: radii.md },
  center: { alignItems: 'center', justifyContent: 'center' },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: THUMB,
    height: THUMB,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  viewerImage: { width: '100%', height: '80%' },
});
