// ============================================================================
// <PhotoQualityNote> — the one time we comment on someone's photograph.
//
// A tailor has just finished a garment they are proud of and is about to put
// it in their shop window. A machine telling them their photo is bad is, in
// that moment, close to insulting. So this component is built around holding
// its tongue, and the constraints matter more than the markup:
//
//   SILENT BY DEFAULT. It renders nothing unless the photo is genuinely going
//   to show the work badly. Verified against the real feed: three actual
//   garment photos scored 75+ and produced no note at all; only a placeholder
//   test image tripped it. If this ever starts firing on decent work, the
//   threshold is wrong and should be raised, not the copy softened.
//
//   ONE THING. topPhotoIssue() returns a single key, so there is no way to
//   accidentally render a list of faults. A list reads as a verdict on your
//   work; one tip reads as someone helping.
//
//   AN ACTION, NOT A DEFECT. The copy never says "too dark" — it says "shoot
//   near a window". See PHOTO_ISSUES for the sentences.
//
//   NO SCORE SHOWN. We have a number and deliberately do not display it.
//   Showing it invites arguing with the machine and turns publishing into
//   being graded.
//
//   NO BLOCKING, AND NOTHING TO DISMISS. Publish stays exactly where it was
//   and works exactly as before. There is no "OK" to tap, because making
//   someone acknowledge criticism is the imposition we are avoiding.
//
// The reason given is the tailor's own interest — clearer photos get seen more
// — because that is both true and the only argument that respects them. It is
// not a standard we are enforcing; it is information they did not have.
// ============================================================================

import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PHOTO_QUALITY_NUDGE_BELOW,
  photoIssueTip,
  topPhotoIssue,
  type PhotoIssueLang,
  type PhotoQuality,
} from '@seamflow/schemas';
import { Text, useAtelierTheme, withAlpha } from '@seamflow/ui';
import { radii, spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

export function PhotoQualityNote({
  quality,
  lang,
}: {
  quality: PhotoQuality | null | undefined;
  lang: PhotoIssueLang;
}) {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();

  if (!quality) return null;

  const issue = topPhotoIssue(quality.issues ?? []);
  if (!issue) return null;

  // A high score with a minor observation is not worth interrupting for. Only
  // speak when the photo will actually let the garment down.
  const score = quality.score;
  if (score !== null && score >= PHOTO_QUALITY_NUDGE_BELOW) return null;

  const tip = photoIssueTip(issue, lang);
  if (!tip) return null;

  return (
    <View
      style={[
        styles.note,
        {
          // Accent, not danger. This is a suggestion about a photograph, not
          // an error, and red would read as "you did something wrong".
          backgroundColor: withAlpha(colors.primary, 0.08),
          borderColor: withAlpha(colors.primary, 0.25),
        },
      ]}
    >
      <Ionicons name="camera-outline" size={16} color={colors.primary} />
      <View style={styles.body}>
        <Text variant="bodySm" tone="text">
          {tip}
        </Text>
        <Text variant="caption" tone="textMuted" style={styles.why}>
          {t('feed.qualityWhy')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  body: { flex: 1 },
  why: { marginTop: 2 },
});
