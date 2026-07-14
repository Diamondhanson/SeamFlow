// ============================================================================
// <WelcomeSlides> — a short, skippable intro shown ONCE to brand-new users.
//
// Rendered as a centered dialog OVER the home screen (not a full-screen
// takeover): three friendly slides that set expectations, then hand off to
// profile setup. Shown while the user has no shop profile yet and hasn't seen
// it before (tracked by GuidesProvider, guideKey "welcome.intro"). Both "Skip"
// and finishing the last slide call onDone().
// ============================================================================

import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Text, useAtelierTheme, withAlpha } from '@seamflow/ui';
import { radii, spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

export function WelcomeSlides({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { colors, shadows } = useAtelierTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  // A big centered card, capped so it doesn't stretch edge-to-edge on a tablet.
  const cardWidth = Math.min(width - spacing.lg * 2, 460);

  const slides = [
    { icon: 'sparkles-outline' as const, title: t('guides.welcomeTitle1'), body: t('guides.welcomeBody1') },
    { icon: 'people-outline' as const, title: t('guides.welcomeTitle2'), body: t('guides.welcomeBody2') },
    { icon: 'calendar-outline' as const, title: t('guides.welcomeTitle3'), body: t('guides.welcomeBody3') },
  ];
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onDone}>
      <View style={[styles.backdrop, { backgroundColor: colors.scrim }]}>
        <View style={[styles.card, { width: cardWidth, backgroundColor: colors.overlay }, shadows.xl]}>
          {/* Skip — top right; on the last slide the CTA is the exit instead. */}
          <View style={styles.skipRow}>
            {!isLast ? (
              <Pressable onPress={onDone} hitSlop={10}>
                <Text variant="bodySm" tone="textMuted">
                  {t('guides.welcomeSkip')}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.iconCircle, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
            <Ionicons name={slide.icon} size={40} color={colors.primary} />
          </View>
          <Text variant="h2" style={styles.title}>
            {slide.title}
          </Text>
          <Text variant="bodySm" tone="textMuted" style={styles.body}>
            {slide.body}
          </Text>

          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === index ? colors.primary : withAlpha(colors.textMuted, 0.3),
                    width: i === index ? 22 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <Button
            label={isLast ? t('guides.welcomeStart') : t('guides.welcomeNext')}
            size="lg"
            onPress={() => (isLast ? onDone() : setIndex((i) => i + 1))}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  skipRow: { alignSelf: 'stretch', alignItems: 'flex-end', height: 20, marginBottom: spacing.sm },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { textAlign: 'center' },
  body: {
    textAlign: 'center',
    lineHeight: 21,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginVertical: spacing.xl,
  },
  dot: { height: 8, borderRadius: 4 },
});
