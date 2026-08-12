// ============================================================================
// "Can you make this?" — posting a request (ROADMAP appendix H).
//
// The whole point of this direction: you do not have to find a tailor first.
// Show a photo of what you want, say a bit about it, and tailors come to you.
//
// Three things are required — a photo, a description, a garment type — and the
// server enforces all three. A brief missing any of them cannot be matched or
// answered sensibly, and letting one through produces a board of "hi, can you
// sew?" posts that tailors learn to ignore.
// ============================================================================

import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  GARMENT_CATEGORY_LABELS,
  garmentsByCategory,
  type GarmentCategory,
  type RequestPhoto,
} from '@seamflow/schemas';
import { Chip, Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { FormScroll } from '../../../components/FormScroll';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { useAuth } from '../../../lib/auth-context';
import { useCreateRequest } from '../../../lib/queries';
import { pickPhoto, uploadRequestPhoto } from '../../../lib/photo-upload';
import { radii, spacing, useThemeColors } from '../../../lib/theme';
import { useDialog } from '../../../lib/dialog';
import { useTranslation } from '../../../lib/i18n';

export default function NewRequest() {
  const { t, language } = useTranslation();
  const lang = language === 'fr' ? 'fr' : 'en';
  const colors = useThemeColors();
  const dialog = useDialog();
  const { session } = useAuth();
  const create = useCreateRequest();

  const [photos, setPhotos] = useState<RequestPhoto[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [garmentType, setGarmentType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');

  const userId = session?.user?.id;

  const addPhoto = async (source: 'camera' | 'library') => {
    if (!userId) return;
    setUploading(true);
    try {
      const asset = await pickPhoto(source);
      if (!asset) return;
      const photo = await uploadRequestPhoto({ userId, asset });
      setPhotos((cur) => [...cur, photo]);
      setPreviews((cur) => [...cur, asset.uri]);
    } catch (err) {
      await dialog.error(err);
    } finally {
      setUploading(false);
    }
  };

  const chooseSource = async () => {
    const pick = await dialog.choose<'camera' | 'library'>({
      title: t('requests.addPhotoTitle'),
      actions: [
        { label: t('requests.takePhoto'), value: 'camera' },
        { label: t('requests.chooseFromGallery'), value: 'library' },
      ],
    });
    if (pick) await addPhoto(pick);
  };

  const post = () => {
    if (!garmentType) return;
    create.mutate(
      {
        description: description.trim(),
        garmentType,
        styleTags: [],
        photos,
        budgetMin: budgetMin ? Number(budgetMin) : null,
        budgetMax: budgetMax ? Number(budgetMax) : null,
        // Country-wide by default: a client who does not know which tailors
        // exist should not have to name one, and narrowing is a later choice
        // rather than a prerequisite to posting at all.
        visibility: 'location',
        locationScope: 'country',
        locationValue: 'CM',
        tailorIds: [],
      },
      {
        onSuccess: (created) => {
          router.replace(`/(app)/requests/${created.id}`);
        },
        onError: (err) => void dialog.error(err),
      },
    );
  };

  const ready = photos.length > 0 && description.trim().length >= 10 && !!garmentType;

  return (
    <Screen>
      <ScreenHeader title={t('requests.newTitle')} />
      <FormScroll contentContainerStyle={{ paddingBottom: 120 }}>
        <Text variant="bodySm" tone="textMuted">{t('requests.newIntro')}</Text>

        {/* Photo first. It is the thing that makes a request answerable, and
            asking for it first sets the expectation that this is show-and-tell
            rather than a form. */}
        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('requests.photosLabel')}
        </Text>
        <View style={styles.photoRow}>
          {previews.map((uri, i) => (
            <View key={uri} style={styles.thumbWrap}>
              <Image source={{ uri }} style={styles.thumb} />
              <Pressable
                style={[styles.remove, { backgroundColor: colors.bg }]}
                onPress={() => {
                  setPhotos((cur) => cur.filter((_, n) => n !== i));
                  setPreviews((cur) => cur.filter((_, n) => n !== i));
                }}
                accessibilityLabel={t('requests.removePhoto')}
              >
                <Ionicons name="close" size={16} color={colors.text} />
              </Pressable>
            </View>
          ))}
          {photos.length < 6 ? (
            <Pressable
              onPress={chooseSource}
              disabled={uploading}
              style={[styles.addPhoto, { borderColor: colors.border }]}
            >
              <Ionicons
                name={uploading ? 'hourglass-outline' : 'add'}
                size={24}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>

        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('requests.garmentLabel')}
        </Text>
        {garmentsByCategory().map(({ category, items }) => (
          <View key={category} style={styles.group}>
            <Text variant="caption" tone="textMuted" style={styles.groupTitle}>
              {GARMENT_CATEGORY_LABELS[category as GarmentCategory][lang]}
            </Text>
            <View style={styles.chips}>
              {items.map((g) => (
                <Chip
                  key={g.key}
                  label={garmentType === g.key ? `✓ ${g[lang]}` : g[lang]}
                  tone={garmentType === g.key ? 'success' : 'primary'}
                  onPress={() => setGarmentType(garmentType === g.key ? null : g.key)}
                />
              ))}
            </View>
          </View>
        ))}

        <Input
          label={t('requests.descriptionLabel')}
          placeholder={t('requests.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('requests.budgetLabel')}
        </Text>
        <Text variant="caption" tone="textMuted" style={{ marginBottom: spacing.sm }}>
          {t('requests.budgetHint')}
        </Text>
        <View style={styles.budgetRow}>
          <View style={styles.budgetCell}>
            <Input
              label={t('requests.budgetFrom')}
              value={budgetMin}
              onChangeText={setBudgetMin}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </View>
          <View style={styles.budgetCell}>
            <Input
              label={t('requests.budgetTo')}
              value={budgetMax}
              onChangeText={setBudgetMax}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </View>
        </View>

        <Button
          label={t('requests.post')}
          onPress={post}
          loading={create.isPending}
          disabled={!ready}
        />
        {!ready ? (
          <Text variant="caption" tone="textMuted" style={styles.needed}>
            {t('requests.needed')}
          </Text>
        ) : null}
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrap: { width: 88, height: 88 },
  thumb: { width: 88, height: 88, borderRadius: radii.md },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    width: 88,
    height: 88,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: { marginBottom: spacing.md },
  groupTitle: { marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  budgetRow: { flexDirection: 'row', gap: spacing.sm },
  budgetCell: { flex: 1 },
  needed: { marginTop: spacing.sm, textAlign: 'center' },
});
