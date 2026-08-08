// ============================================================================
// One design, full screen (ROADMAP D.6.2).
//
// The tailor attribution overlay is the load-bearing element: bottom-left, over
// a scrim so it stays legible on any photo, and tappable straight through to
// their storefront. Bottom-left rather than top-left because the top corners
// carry the close button and the status bar, and the thumb rests low on a phone.
//
// It renders from data the feed response already carried — every FeedPostPublic
// embeds the tailor mini-profile — so opening this screen costs no extra request
// for the attribution.
// ============================================================================

import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { SkeletonDetail } from '../../components/Skeleton';
import { Button } from '../../components/Button';
import { useFeedPost } from '../../lib/queries';
import { useAuth } from '../../lib/auth-context';
import { useDialog } from '../../lib/dialog';
import { spacing, radii, useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

export default function DesignDetail() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { colors: atelier } = useAtelierTheme();
  const dialog = useDialog();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const postQ = useFeedPost(id);
  const post = postQ.data?.post;

  /**
   * Auth gate on ACTION, not on browsing (D-4). Someone who just found the app
   * should be able to look at everything; we only ask who they are at the
   * moment a tailor would need to reply to them.
   */
  const inquire = async () => {
    if (!post) return;
    if (!session) {
      const ok = await dialog.confirm({
        title: t('discover.inquireSignInTitle'),
        message: t('discover.inquireSignInBody'),
        confirmLabel: t('discover.inquireSignIn'),
      });
      if (ok) router.push('/sign-in');
      return;
    }
    router.push({
      pathname: '/(app)/discover/inquire',
      params: { designId: post.id, tailorId: post.tailor.id, tailorName: post.tailor.businessName },
    });
  };

  if (postQ.isLoading && !post) {
    return (
      <Screen>
        <SkeletonDetail />
      </Screen>
    );
  }

  if (!post) {
    return (
      <Screen>
        <View style={styles.empty}>
          <Text variant="body" tone="textMuted">
            {t('discover.emptyTitle')}
          </Text>
        </View>
      </Screen>
    );
  }

  const tailor = post.tailor;

  return (
    <Screen padded={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View>
          <Image
            source={{ uri: post.imageUrl }}
            style={[styles.hero, { backgroundColor: colors.card }]}
            resizeMode="cover"
          />

          {/* Close, top-left — deliberately not where the attribution goes. */}
          <Pressable
            onPress={() => router.back()}
            style={styles.close}
            accessibilityLabel="Close"
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>

          {/* ── Tailor attribution overlay ── */}
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(app)/discover/tailor/[tailorId]',
                params: { tailorId: tailor.id },
              })
            }
            style={styles.attribution}
          >
            <View style={[styles.attributionCard, { borderRadius: radii.lg }]}>
              <View style={styles.attributionTop}>
                <Text variant="body" style={styles.attributionName} numberOfLines={1}>
                  {tailor.businessName}
                </Text>
                {tailor.isVerified ? (
                  <Ionicons name="checkmark-circle" size={16} color={atelier.primary} />
                ) : null}
              </View>
              <Text variant="caption" style={styles.attributionMeta} numberOfLines={1}>
                {[
                  tailor.city,
                  tailor.responseTimeHours != null
                    ? t('discover.repliesIn', { hours: tailor.responseTimeHours })
                    : null,
                  tailor.acceptsRemote ? t('discover.acceptsRemote') : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text variant="caption" style={styles.attributionCta}>
                {t('discover.viewTailor')} ›
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.body}>
          {post.caption ? <Text variant="body">{post.caption}</Text> : null}

          <View style={styles.metaRow}>
            {[post.garmentType, post.fabric, post.city].filter(Boolean).map((m) => (
              <View
                key={m as string}
                style={[styles.tag, { backgroundColor: colors.card, borderRadius: radii.lg }]}
              >
                <Text variant="caption" tone="textMuted">
                  {m}
                </Text>
              </View>
            ))}
          </View>

          {post.startingPrice ? (
            <Text variant="bodySm" tone="textMuted">
              {t('discover.fromPrice', {
                price: `${post.startingPrice} ${post.currency ?? ''}`.trim(),
              })}
            </Text>
          ) : null}

          <View style={styles.cta}>
            <Button label={t('discover.inquire')} onPress={inquire} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 460 },
  close: {
    // Fixed scrim rather than a theme token: it sits over an arbitrary
    // photo, so it must stay dark in light mode too.
    backgroundColor: 'rgba(0,0,0,0.45)',
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bottom-left, over a scrim: legible on any photo, and where the thumb is.
  attribution: { position: 'absolute', left: spacing.lg, bottom: spacing.lg, right: spacing.lg },
  attributionCard: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: spacing.md,
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  attributionTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  attributionName: { color: '#fff', fontWeight: '700' },
  attributionMeta: { color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  attributionCta: { color: '#fff', marginTop: spacing.xs, fontWeight: '600' },
  body: { padding: spacing.lg, gap: spacing.md },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  cta: { marginTop: spacing.md },
  empty: { alignItems: 'center', paddingTop: spacing.xl * 2 },
});
