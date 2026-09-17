// ============================================================================
// Publish a finished-order photo to the public discovery feed (ROADMAP D.4.1).
//
// The consent copy at the top is not decoration. Publishing makes an image
// world-readable, and the tailor is publishing a photo of a *client's* garment
// — so the screen states plainly what does and doesn't become public before
// they commit.
//
// WHY THIS SCREEN IS CHIPS AND NOT TEXT BOXES
// It used to be five empty fields. Of the 38 designs published through it,
// ZERO carried a single tag and `garment_type` had drifted into "dress",
// "gown", "set" and "cover-up" — four words for two things, plus four rows
// with nothing at all. Nobody was being lazy; typing five fields on a phone
// after finishing a garment is simply not going to happen.
//
// So the photo is classified the moment the screen opens, and the tailor
// CORRECTS rather than composes. Every value is a key from a shared
// vocabulary, which is what makes the feed searchable at all — and what lets
// a French shopper's "robe" reach an English caption, because the row stores
// `kaftan` and the label is looked up per language.
//
// Three rules the classification must obey, learned from watching it:
//   · it runs automatically, but NEVER blocks. The form is usable from the
//     first frame; chips arrive 5-7s later and fold in underneath the
//     tailor's own edits, which always win.
//   · an empty result is ORDINARY. The model declines on an unclear photo,
//     and that must look like "nothing suggested", not like a failure.
//   · a wrong chip costs one tap. That is the entire budget — get it wrong
//     often enough and the tailor stops reading the chips at all.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ATTRIBUTE_GROUP_LABELS,
  DESIGN_COLORS,
  GARMENT_CATEGORY_LABELS,
  attributesByGroup,
  colorHex,
  garmentsByCategory,
  normalizeAttributes,
  type AttributeGroup,
  type DesignColor,
  type GarmentCategory,
} from '@seamflow/schemas';
import { Chip, Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FormScroll } from '../../../components/FormScroll';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { api } from '../../../lib/api';
import { usePublishOrderPhoto } from '../../../lib/queries';
import { useDialog } from '../../../lib/dialog';
import { spacing, radii } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';

/** Both exclusive pickers below behave identically; this is the shared body. */
function ChipRow({
  items,
  selected,
  onToggle,
}: {
  items: { key: string; label: string; swatch?: string | null }[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  const { colors } = useAtelierTheme();
  return (
    <View style={styles.chips}>
      {items.map((item) => (
        <View key={item.key} style={styles.chipWrap}>
          {item.swatch ? (
            <View
              style={[
                styles.swatch,
                { backgroundColor: item.swatch, borderColor: colors.hairline },
              ]}
            />
          ) : null}
          <Chip
            variant="filter"
            label={item.label}
            selected={selected.includes(item.key)}
            onPress={() => onToggle(item.key)}
          />
        </View>
      ))}
    </View>
  );
}

export default function PublishToFeed() {
  const { t, language } = useTranslation();
  const lang = (['en', 'fr', 'pt', 'es', 'sw', 'ar'] as const).includes(language as never)
    ? (language as 'en' | 'fr' | 'pt' | 'es' | 'sw' | 'ar')
    : 'en';
  const { colors } = useAtelierTheme();
  const dialog = useDialog();

  const params = useLocalSearchParams<{
    photoId: string;
    orderId: string;
    previewUrl?: string;
    garmentType?: string;
    storagePath?: string;
  }>();

  const publish = usePublishOrderPhoto(params.orderId ?? '');

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [garmentType, setGarmentType] = useState(params.garmentType ?? '');
  const [garmentKey, setGarmentKey] = useState<string | null>(null);
  const [audience, setAudience] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<string | null>(null);
  const [colorKeys, setColorKeys] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<string[]>([]);
  const [fabric, setFabric] = useState('');
  const [startingPrice, setStartingPrice] = useState('');

  const [reading, setReading] = useState(false);
  const [suggested, setSuggested] = useState(false);
  const [showAllGarments, setShowAllGarments] = useState(false);

  // Anything the tailor touched is theirs. A suggestion that lands afterwards
  // fills the gaps and never overwrites a decision already made.
  const touched = useRef(new Set<string>());
  const mark = (field: string) => touched.current.add(field);

  useEffect(() => {
    if (!params.storagePath) return;
    let cancelled = false;
    setReading(true);

    api.ai
      .classifyDesign({
        storagePath: params.storagePath,
        bucket: 'order-photos',
        // What the tailor already told us beats what the pixels suggest —
        // measurably so: without this a captioned "kaftan" came back as a
        // wrapper set.
        garmentType: params.garmentType ?? null,
      })
      .then((c) => {
        if (cancelled) return;
        setSuggested(true);
        if (!touched.current.has('title') && c.title) setTitle(c.title);
        if (!touched.current.has('caption') && c.caption) setCaption(c.caption);
        if (!touched.current.has('garment') && c.garmentKey) setGarmentKey(c.garmentKey);
        if (!touched.current.has('audience') && c.audience) setAudience(c.audience);
        if (!touched.current.has('occasion') && c.occasion) setOccasion(c.occasion);
        if (!touched.current.has('fabric') && c.fabric) setFabric(c.fabric);
        if (!touched.current.has('colors')) setColorKeys(c.colors);
        if (!touched.current.has('attributes')) setAttributes(c.attributes);
      })
      // Silent on purpose. This is a convenience the tailor never asked for;
      // failing it loudly (no key, no signal, unclear photo) would turn a
      // non-event into an interruption. The form still works.
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReading(false);
      });

    return () => {
      cancelled = true;
    };
    // Once, on mount — re-running would fight the tailor's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAttribute = (key: string) => {
    mark('attributes');
    // Put the tapped key first so normalizeAttributes keeps IT when it
    // resolves an exclusive group — tapping "Midi" should replace "Maxi",
    // not be silently discarded in favour of it.
    setAttributes((cur) =>
      cur.includes(key)
        ? cur.filter((k) => k !== key)
        : normalizeAttributes([key, ...cur]),
    );
  };

  const toggleColor = (key: string) => {
    mark('colors');
    setColorKeys((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key].slice(0, 4),
    );
  };

  const submit = () => {
    // Rank is the only dominance signal available without reading pixels, so
    // first-chosen is treated as most dominant. Real per-pixel shares are the
    // next refinement here; the shape is already right for them.
    const colorsPayload: DesignColor[] = colorKeys.map((key, i) => ({
      key,
      hex: colorHex(key) ?? '#000000',
      share: Number(((colorKeys.length - i) / colorKeys.length).toFixed(2)),
    }));

    publish.mutate(
      {
        orderPhotoId: params.photoId,
        input: {
          title: title.trim() || null,
          caption: caption.trim() || null,
          garmentType: garmentType.trim() || null,
          garmentKey,
          audience: audience as never,
          occasion: occasion as never,
          colors: colorsPayload,
          attributes,
          tags: [],
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

  const garmentGroups = garmentsByCategory();
  const selectedGarment = garmentGroups
    .flatMap((g) => g.items)
    .find((g) => g.key === garmentKey);

  return (
    <Screen>
      <ScreenHeader title={t('feed.publishTitle')} />
      <FormScroll contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
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

        <View style={[styles.consent, { backgroundColor: colors.surface, borderRadius: radii.lg }]}>
          <Text variant="bodySm" tone="textMuted">{t('feed.publishBody')}</Text>
        </View>

        {/* One quiet line, never a blocking spinner. */}
        {reading ? (
          <Text variant="caption" tone="textMuted" style={styles.status}>
            {t('feed.readingPhoto')}
          </Text>
        ) : suggested ? (
          <Text variant="caption" tone="textMuted" style={styles.status}>
            {t('feed.suggestedNote')}
          </Text>
        ) : null}

        <Input
          label={t('feed.titleLabel')}
          placeholder={t('feed.titlePlaceholder')}
          value={title}
          onChangeText={(v) => { mark('title'); setTitle(v); }}
        />
        <Input
          label={t('feed.captionLabel')}
          placeholder={t('feed.captionPlaceholder')}
          value={caption}
          onChangeText={(v) => { mark('caption'); setCaption(v); }}
          multiline
        />

        {/* ---- Garment ------------------------------------------------- */}
        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('feed.garmentSection')}
        </Text>
        {selectedGarment && !showAllGarments ? (
          <View style={styles.chips}>
            <Chip variant="filter" label={selectedGarment[lang]} selected onPress={() => setShowAllGarments(true)} />
            <Chip variant="filter" label={t('feed.changeGarment')} onPress={() => setShowAllGarments(true)} />
          </View>
        ) : (
          garmentGroups.map(({ category, items }) => (
            <View key={category} style={styles.group}>
              <Text variant="caption" tone="textMuted" style={styles.groupTitle}>
                {GARMENT_CATEGORY_LABELS[category as GarmentCategory][lang]}
              </Text>
              <ChipRow
                items={items.map((g) => ({ key: g.key, label: g[lang] }))}
                selected={garmentKey ? [garmentKey] : []}
                onToggle={(key) => {
                  mark('garment');
                  setGarmentKey(garmentKey === key ? null : key);
                  setShowAllGarments(false);
                }}
              />
            </View>
          ))
        )}

        {/* ---- Audience / occasion -------------------------------------- */}
        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('feed.audienceSection')}
        </Text>
        <ChipRow
          items={(['women', 'men', 'unisex', 'children'] as const).map((k) => ({
            key: k,
            label: t(`feed.audience_${k}`),
          }))}
          selected={audience ? [audience] : []}
          onToggle={(k) => { mark('audience'); setAudience(audience === k ? null : k); }}
        />

        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('feed.occasionSection')}
        </Text>
        <ChipRow
          items={(['wedding', 'traditional', 'corporate', 'casual', 'party'] as const).map((k) => ({
            key: k,
            label: t(`feed.occasion_${k}`),
          }))}
          selected={occasion ? [occasion] : []}
          onToggle={(k) => { mark('occasion'); setOccasion(occasion === k ? null : k); }}
        />

        {/* ---- Colours --------------------------------------------------- */}
        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('feed.colorsSection')}
        </Text>
        <ChipRow
          items={DESIGN_COLORS.map((c) => ({ key: c.key, label: c[lang], swatch: c.hex }))}
          selected={colorKeys}
          onToggle={toggleColor}
        />

        {/* ---- Style ----------------------------------------------------- */}
        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('feed.styleSection')}
        </Text>
        {attributesByGroup().map(({ group, items }) => (
          <View key={group} style={styles.group}>
            <Text variant="caption" tone="textMuted" style={styles.groupTitle}>
              {ATTRIBUTE_GROUP_LABELS[group as AttributeGroup][lang]}
            </Text>
            <ChipRow
              items={items.map((a) => ({ key: a.key, label: a[lang] }))}
              selected={attributes}
              onToggle={toggleAttribute}
            />
          </View>
        ))}

        <View style={{ height: spacing.md }} />
        <Input
          label={t('feed.fabricLabel')}
          placeholder={t('feed.fabricPlaceholder')}
          value={fabric}
          onChangeText={(v) => { mark('fabric'); setFabric(v); }}
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

        <View style={[styles.why, { backgroundColor: colors.surface, borderRadius: radii.lg }]}>
          <Text variant="label" tone="textMuted">{t('feed.whySection')}</Text>
          <Text variant="bodySm" tone="textMuted" style={{ marginTop: 4 }}>
            {t('feed.whyBody')}
          </Text>
        </View>

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
  consent: { padding: spacing.md, marginBottom: spacing.md },
  status: { marginBottom: spacing.md },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  group: { marginBottom: spacing.md },
  groupTitle: { marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  chipWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 1 },
  help: { marginTop: -spacing.xs, marginBottom: spacing.md },
  why: { padding: spacing.md, marginTop: spacing.md },
  submit: { marginTop: spacing.md },
});
