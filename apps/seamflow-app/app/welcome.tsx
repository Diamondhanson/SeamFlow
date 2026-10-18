// ============================================================================
// The first thing a new install ever shows.
//
// Language, then three slides, then Discover. Shown once per DEVICE — the flag
// lives in lib/first-run, outside the guides store, so signing out does not
// replay it at someone who has already seen it.
//
// WHY LANGUAGE COMES FIRST
//
// Not only so the slides are readable. The app currently guesses from the
// device locale and commits silently, which is wrong often enough to matter in
// a market where a phone is set to French and its owner works in English. One
// tap, once, beats a guess — and Settings can still change it later.
//
// Choosing an RTL language has to reopen the app: `I18nManager.forceRTL` only
// lands when the native view hierarchy is recreated. That is what expo-updates
// is here for. When the reload cannot run — Expo Go, a dev build — we say so
// plainly rather than leaving the app half-mirrored and silent.
//
// IT IS SKIPPABLE FROM THE FIRST SLIDE
//
// Three screens is already a lot to put between someone and the photographs
// that make the argument for this app. Skip is visible the whole way, and the
// language step is the only part that is not — it is one tap and everything
// after it depends on the answer.
// ============================================================================

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInRight } from 'react-native-reanimated';
import { Button, Text, useAtelierTheme, withAlpha } from '@seamflow/ui';
import { Infographic } from '../components/welcome/Infographic';
import { useDialog } from '../lib/dialog';
import { useFirstRun } from '../lib/first-run';
import { useMe } from '../lib/queries';
import { haptics } from '../lib/haptics';
import { LANGUAGES, useTranslation, type LanguageCode } from '../lib/i18n';
import { radii, spacing, useThemeColors } from '../lib/theme';

const SLIDES = [0, 1, 2] as const;

export default function Welcome() {
  const { t, language, setLanguage, reloadNow } = useTranslation();
  const colors = useThemeColors();
  const { colors: atelier } = useAtelierTheme();
  const dialog = useDialog();
  const { markSeen } = useFirstRun();
  // Signed out this is simply undefined, which is the new-install case.
  const { data: me } = useMe();

  // `null` while the language question is still open.
  const [slide, setSlide] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);

  /**
   * Hand off to wherever this person actually belongs.
   *
   * Discover for a brand-new install, which is the case this flow was written
   * for. But the intro flag is new, so EVERY existing user meets it once on
   * upgrade — and sending a tailor of six months to the customer feed after a
   * welcome sequence would be a worse first impression than the one this is
   * meant to fix. Same rule as the cold-start router: a shop decides.
   */
  const finish = () => {
    haptics.success();
    markSeen();
    router.replace((me?.tailor ? '/(app)' : '/(client)/discover') as never);
  };

  const choose = async (code: LanguageCode) => {
    if (picking) return;
    setPicking(true);
    haptics.success();

    const { requiresRestart } = setLanguage(code);
    if (!requiresRestart) {
      setSlide(0);
      setPicking(false);
      return;
    }

    // Direction changed. The intro is marked seen BEFORE reloading: the app is
    // about to disappear, and coming back to the same question they just
    // answered would be the worst possible first impression.
    markSeen();
    await dialog.alert({ title: t('welcome.rtlTitle'), message: t('welcome.rtlBody'), tone: 'info' });
    const reloaded = await reloadNow();
    if (!reloaded) {
      // Expo Go, a development build, or updates unavailable. The direction is
      // already stored and applies on the next launch, so this is the honest
      // thing left to say.
      await dialog.alert({ title: t('welcome.rtlTitle'), message: t('welcome.rtlManual'), tone: 'warning' });
      router.replace((me?.tailor ? '/(app)' : '/(client)/discover') as never);
    }
  };

  // ---- Step one: the language ---------------------------------------------
  if (slide === null) {
    return (
      <Animated.View
        entering={FadeIn.duration(400)}
        style={[styles.screen, { backgroundColor: colors.bg }]}
      >
        <View style={styles.langHead}>
          <View style={[styles.mark, { backgroundColor: withAlpha(atelier.primary, 0.14) }]}>
            <Ionicons name="language" size={26} color={atelier.primary} />
          </View>
          <Text variant="h1" style={styles.langTitle}>
            {t('welcome.langTitle')}
          </Text>
          <Text variant="bodySm" tone="textMuted" style={styles.center}>
            {t('welcome.langBody')}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.langList} showsVerticalScrollIndicator={false}>
          {LANGUAGES.map((l) => (
            <Pressable
              key={l.code}
              onPress={() => void choose(l.code)}
              disabled={picking}
              accessibilityRole="button"
              // Its OWN name, never translated. Someone looking for Kiswahili
              // should not have to recognise the English word for it first.
              accessibilityLabel={l.label}
              style={[
                styles.langRow,
                {
                  backgroundColor: colors.card,
                  borderColor: l.code === language ? atelier.primary : colors.hairline,
                },
              ]}
            >
              <Text variant="body" style={styles.langName}>
                {l.label}
              </Text>
              {l.code === language ? (
                <Ionicons name="checkmark-circle" size={20} color={atelier.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              )}
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    );
  }

  // ---- Step two: the slides ------------------------------------------------
  const isLast = slide === SLIDES.length - 1;
  const titles = ['welcome.s1Title', 'welcome.s2Title', 'welcome.s3Title'];
  const bodies = ['welcome.s1Body', 'welcome.s2Body', 'welcome.s3Body'];

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(220)}
      style={[styles.screen, { backgroundColor: colors.bg }]}
    >
      <View style={styles.skipRow}>
        <Pressable onPress={finish} hitSlop={10} accessibilityRole="button">
          <Text variant="bodySm" tone="textMuted">
            {t('welcome.skip')}
          </Text>
        </Pressable>
      </View>

      {/* Keyed on the index so each slide genuinely re-enters rather than
          cross-fading its own contents into the next one's. */}
      <Animated.View key={slide} entering={SlideInRight.duration(280)} style={styles.slide}>
        <Infographic slide={slide as 0 | 1 | 2} />
        <Text variant="h1" style={styles.slideTitle}>
          {t(titles[slide]!)}
        </Text>
        <Text variant="body" tone="textMuted" style={styles.slideBody}>
          {t(bodies[slide]!)}
        </Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === slide ? atelier.primary : colors.border,
                  width: i === slide ? 20 : 6,
                },
              ]}
            />
          ))}
        </View>
        <Button
          label={isLast ? t('welcome.start') : t('welcome.next')}
          size="lg"
          onPress={() => {
            haptics.sent();
            if (isLast) finish();
            else setSlide(slide + 1);
          }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl * 2 },
  center: { textAlign: 'center' },

  langHead: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  mark: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  langTitle: { textAlign: 'center' },
  langList: { gap: spacing.sm, paddingBottom: spacing.xl },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  langName: { flex: 1 },

  skipRow: { alignItems: 'flex-end', minHeight: 24 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  slideTitle: { textAlign: 'center' },
  slideBody: { textAlign: 'center', paddingHorizontal: spacing.sm },

  footer: { gap: spacing.lg, paddingBottom: spacing.xl },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
});
