// ============================================================================
// Publish a finished-order photo to the public discovery feed (ROADMAP D.4.1).
//
// The consent copy at the top is not decoration. Publishing makes an image
// world-readable, and the tailor is publishing a photo of a *client's* garment
// — so the screen states plainly what does and doesn't become public before
// they commit.
// ============================================================================

import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FormScroll } from '../../../components/FormScroll';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { usePublishOrderPhoto } from '../../../lib/queries';
import { useDialog } from '../../../lib/dialog';
import { spacing, radii } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';

export default function PublishToFeed() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const dialog = useDialog();

  const params = useLocalSearchParams<{
    photoId: string;
    orderId: string;
    previewUrl?: string;
    garmentType?: string;
  }>();

  const publish = usePublishOrderPhoto(params.orderId ?? '');

  // Garment type is prefilled from the order item — the tailor already told us
  // what this is, so asking again would be busywork.
  const [caption, setCaption] = useState('');
  const [garmentType, setGarmentType] = useState(params.garmentType ?? '');
  const [tags, setTags] = useState('');
  const [fabric, setFabric] = useState('');
  const [startingPrice, setStartingPrice] = useState('');

  const submit = () => {
    publish.mutate(
      {
        orderPhotoId: params.photoId,
        input: {
          caption: caption.trim() || null,
          garmentType: garmentType.trim() || null,
          tags: tags
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 10),
          fabric: fabric.trim() || null,
          startingPrice: startingPrice.trim() || null,
        },
      },
      {
        onSuccess: async () => {
          await dialog.alert({
            title: t('feed.publishedTitle'),
            message: t('feed.publishedBody'),
            tone: 'success',
          });
          router.back();
        },
        onError: (err) => void dialog.error(err),
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title={t('feed.publishTitle')} />
      <FormScroll contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {params.previewUrl ? (
          <Image
            source={{ uri: params.previewUrl }}
            style={[
              styles.preview,
              { backgroundColor: colors.surface, borderRadius: radii.lg },
            ]}
            resizeMode="cover"
          />
        ) : null}

        <View
          style={[
            styles.consent,
            { backgroundColor: colors.surface, borderRadius: radii.lg },
          ]}
        >
          <Text variant="bodySm" tone="textMuted">
            {t('feed.publishBody')}
          </Text>
        </View>

        <Input
          label={t('feed.captionLabel')}
          placeholder={t('feed.captionPlaceholder')}
          value={caption}
          onChangeText={setCaption}
          multiline
        />
        <Input
          label={t('feed.garmentTypeLabel')}
          placeholder={t('feed.garmentTypePlaceholder')}
          value={garmentType}
          onChangeText={setGarmentType}
        />
        <Input
          label={t('feed.fabricLabel')}
          placeholder={t('feed.fabricPlaceholder')}
          value={fabric}
          onChangeText={setFabric}
        />
        <Input
          label={t('feed.tagsLabel')}
          placeholder={t('feed.tagsPlaceholder')}
          value={tags}
          onChangeText={setTags}
          autoCapitalize="none"
        />
        <Input
          label={t('feed.startingPriceLabel')}
          placeholder="0"
          value={startingPrice}
          onChangeText={setStartingPrice}
          keyboardType="decimal-pad"
        />
        <Text variant="caption" tone="textMuted" style={styles.help}>
          {t('feed.startingPriceHelp')}
        </Text>

        <View style={styles.submit}>
          <Button
            label={publish.isPending ? t('feed.publishing') : t('feed.publishCta')}
            onPress={submit}
            disabled={publish.isPending}
            loading={publish.isPending}
          />
        </View>
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', height: 220, marginBottom: spacing.md },
  consent: { padding: spacing.md, marginBottom: spacing.lg },
  help: { marginTop: -spacing.xs, marginBottom: spacing.md },
  submit: { marginTop: spacing.md },
});
