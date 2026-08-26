// ============================================================================
// A tailor's shop, as the client app renders it.
//
// Extracted so the two ways of arriving at a tailor render the same screen:
//
//   /discover/tailor/<uuid>  — tapped from the feed, where we already know the id
//   /t/<slug>                — a shared catalogue link, opened from WhatsApp
//
// They differ only in how the tailor is looked up. Keeping one view means a
// change to the shop layout cannot land on one route and miss the other — and
// the deep-link route is the one nobody remembers to test.
// ============================================================================

import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { FeedPostPublic, TailorPublicProfile } from '@seamflow/schemas';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from './Screen';
import { ScreenHeader } from './ScreenHeader';
import { SkeletonGrid } from './Skeleton';
import { Button } from './Button';
import { useGridColumns, useContentWidth } from '../lib/use-breakpoint';
import { useFloatingScroll } from '../lib/floating-scroll';
import { spacing, radii, useThemeColors } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

export interface StorefrontViewProps {
  tailor: TailorPublicProfile | undefined;
  posts: FeedPostPublic[];
  isLoading: boolean;
  onInquire: () => void;
  /** Rendered under the CTA — the deep-link route uses it for "not found". */
  notFound?: boolean;
  notFoundLabel?: string;
}

export function StorefrontView({
  tailor,
  posts,
  isLoading,
  onInquire,
  notFound,
  notFoundLabel,
}: StorefrontViewProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { colors: atelier } = useAtelierTheme();
  const scroll = useFloatingScroll();

  const columns = useGridColumns();
  const contentWidth = useContentWidth();
  const gap = spacing.md;
  const cellW = (contentWidth - spacing.lg * 2 - gap * (columns - 1)) / columns;

  if (notFound) {
    return (
      <Screen padded={false} width="wide">
        <View style={styles.padded}>
          <ScreenHeader title="" />
        </View>
        <View style={styles.empty}>
          <Text variant="bodySm" tone="textMuted">
            {notFoundLabel}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false} width="wide">
      <View style={styles.padded}>
        <ScreenHeader title={tailor?.businessName ?? ''} />

        {tailor ? (
          <View style={styles.profile}>
            <View style={styles.nameRow}>
              <Text variant="h3">{tailor.businessName}</Text>
              {tailor.isVerified ? (
                <Ionicons name="checkmark-circle" size={18} color={atelier.primary} />
              ) : null}
            </View>

            <Text variant="bodySm" tone="textMuted">
              {[
                tailor.city,
                tailor.acceptsRemote ? t('discover.acceptsRemote') : null,
                tailor.responseTimeHours != null
                  ? t('discover.repliesIn', { hours: tailor.responseTimeHours })
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>

            {tailor.bio ? (
              <Text variant="body" style={styles.bio}>
                {tailor.bio}
              </Text>
            ) : null}

            {tailor.specialties.length > 0 ? (
              <View style={styles.tagRow}>
                {tailor.specialties.map((sp) => (
                  <View
                    key={sp}
                    style={[styles.tag, { backgroundColor: colors.card, borderRadius: radii.lg }]}
                  >
                    <Text variant="caption" tone="textMuted">
                      {sp}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.cta}>
              <Button label={t('discover.inquire')} onPress={onInquire} />
            </View>
          </View>
        ) : null}

        <Text variant="h3" style={styles.worksTitle}>
          {t('discover.storefrontWorks')}
        </Text>
      </View>

      {isLoading && posts.length === 0 ? (
        <View style={styles.padded}>
          <SkeletonGrid columns={columns} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="bodySm" tone="textMuted">
            {t('discover.storefrontEmpty')}
          </Text>
        </View>
      ) : (
        <ScrollView {...scroll} contentContainerStyle={styles.grid}>
          <View style={[styles.wrap, { gap }]}>
            {posts.map((post) => {
              const ratio = post.width && post.height ? post.width / post.height : 1;
              return (
                <Pressable
                  key={post.id}
                  onPress={() =>
                    router.push({ pathname: '/(app)/discover/[id]', params: { id: post.id } })
                  }
                  style={{ width: cellW }}
                >
                  <Image
                    source={{ uri: post.thumbnailUrl }}
                    style={{
                      width: cellW,
                      height: cellW / ratio,
                      backgroundColor: colors.card,
                      borderRadius: radii.md,
                    }}
                  />
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  profile: { gap: spacing.sm, marginBottom: spacing.lg },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  bio: { marginTop: spacing.xs },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  tag: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  cta: { marginTop: spacing.md },
  worksTitle: { marginBottom: spacing.sm },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  empty: { alignItems: 'center', paddingTop: spacing.xl },
});
