// ============================================================================
// <FabricPhotoField> — attach one swatch photo to a fabric. A single square
// tile: tap to add (camera/gallery), tap the × to remove. Distilled from
// <TemplateImagesEditor> but for a single image stored on the fabric's
// photoKey / photoThumbKey columns.
//
// The parent owns the value; this handles pick → upload → onChange. A freshly
// picked image carries a local `previewUri` so it shows before the server hands
// back a signed URL.
// ============================================================================

import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { pickPhoto, uploadFabricImage } from '../lib/photo-upload';
import { alertIfOffline, alertIfPermissionDenied } from '../lib/permissions';
import { useDialog } from '../lib/dialog';
import { useTranslation } from '../lib/i18n';
import { radii, spacing } from '../lib/theme';

export interface FabricPhotoValue {
  photoKey: string | null;
  photoThumbKey: string | null;
  /** Signed URLs from the API (existing fabric). */
  photoUrl?: string | null;
  photoThumbUrl?: string | null;
  /** Local asset uri right after upload, before a signed URL exists. */
  previewUri?: string;
}

export function FabricPhotoField({
  tailorId,
  value,
  onChange,
}: {
  tailorId: string | undefined;
  value: FabricPhotoValue;
  onChange: (next: FabricPhotoValue) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const dialog = useDialog();
  const [uploading, setUploading] = useState(false);

  const displayUri =
    value.previewUri ?? value.photoThumbUrl ?? value.photoUrl ?? null;
  const hasPhoto = !!(value.photoKey || value.previewUri);

  const add = async (source: 'camera' | 'library') => {
    if (!tailorId) return;
    setUploading(true);
    try {
      const asset = await pickPhoto(source);
      if (!asset) return;
      const meta = await uploadFabricImage({ tailorId, asset });
      onChange({
        photoKey: meta.photoKey,
        photoThumbKey: meta.photoThumbKey,
        previewUri: asset.uri,
        photoUrl: null,
        photoThumbUrl: null,
      });
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
      title: t('fabrics.photoSourceTitle'),
      actions: [
        { label: t('fabrics.takePhoto'), value: 'camera' },
        { label: t('fabrics.chooseFromGallery'), value: 'library' },
      ],
    });
    if (action) add(action);
  };

  const remove = () =>
    onChange({ photoKey: null, photoThumbKey: null, previewUri: undefined });

  return (
    <View>
      <Text variant="h3">{t('fabrics.photoLabel')}</Text>
      <Text variant="bodySm" tone="textMuted" style={styles.help}>
        {t('fabrics.photoHelp')}
      </Text>

      <View style={styles.row}>
        {hasPhoto && displayUri ? (
          <View style={styles.tileWrap}>
            <Pressable onPress={promptAdd} disabled={uploading}>
              <Image
                source={{ uri: displayUri }}
                style={[styles.tile, { backgroundColor: colors.surface }]}
              />
              {uploading ? (
                <View style={[styles.tile, styles.center, styles.overlay]}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={remove}
              hitSlop={8}
              accessibilityLabel={t('fabrics.removePhoto')}
              style={[styles.removeBadge, { backgroundColor: colors.scrim }]}
            >
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={promptAdd}
            disabled={uploading || !tailorId}
            accessibilityRole="button"
            accessibilityLabel={t('fabrics.addPhoto')}
            style={[styles.addTile, { borderColor: colors.border }]}
          >
            {uploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={26} color={colors.textMuted} />
                <Text variant="bodySm" tone="textMuted" style={{ marginTop: 4 }}>
                  {t('fabrics.addPhoto')}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const TILE = 120;

const styles = StyleSheet.create({
  help: { marginTop: 2, marginBottom: spacing.md },
  row: { flexDirection: 'row' },
  tileWrap: { width: TILE },
  tile: { width: TILE, height: TILE, borderRadius: radii.md },
  center: { alignItems: 'center', justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
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
    width: TILE,
    height: TILE,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
