// ============================================================================
// A tailor's storefront (ROADMAP D.6.5).
//
// Where the attribution overlay leads. Profile header plus the rest of their
// published work, ranked most-recently-published first — which is what
// GET /tailors/:id/storefront already returns, so there's nothing to sort here.
//
// Public: no session required, same as the feed.
// ============================================================================

import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonGrid } from '../../../components/Skeleton';
import { Button } from '../../../components/Button';
import { useStorefront } from '../../../lib/queries';
import { useAuth } from '../../../lib/auth-context';
import { useDialog } from '../../../lib/dialog';
import { useGridColumns, useContentWidth } from '../../../lib/use-breakpoint';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { spacing, radii, useThemeColors } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';

export default function Storefront() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { colors: atelier } = useAtelierTheme();
  const scroll = useFloatingScroll();
  const dialog = useDialog();
  const { session } = useAuth();
  const { tailorId } = useLocalSearchParams<{ tailorId: string }>();

  const q = useStorefront(tailorId);
  const tailor = q.data?.tailor;
  const posts = q.data?.posts.items ?? [];

  const columns = useGridColumns();
  const contentWidth = useContentWidth();
  const gap = spacing.md;
  const cellW = (contentWidth - spacing.lg * 2 - gap * (columns - 1)) / columns;

  const inquire = async () => {
    if (!tailor) return;
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
      params: { tailorId: tailor.id, tailorName: tailor.businessName },
    });
  };

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
              <Button label={t('discover.inquire')} onPress={inquire} />
            </View>
          </View>
        ) : null}

        <Text variant="h3" style={styles.worksTitle}>
          {t('discover.storefrontWorks')}
        </Text>
      </View>

      {q.isLoading && posts.length === 0 ? (
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
