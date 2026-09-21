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
//
// Tapping the hero opens <FullscreenGallery>: every angle shown WHOLE at its own
// aspect ratio, over a blurred wash of the photo's own colours. The hero here
// crops to fill a fixed box, which is right for a page and wrong for actually
// looking at a garment — a gown loses its hem, a two-piece its sleeves.
//
// "More like this" sits under the enquiry button. It is not real similarity
// yet (see FeedService.moreLikeThis) but the section is built against the real
// contract, so when it becomes real nothing here changes.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { FeedImage, FeedPostPublic } from '@seamflow/schemas';
import { formatCurrency } from '@seamflow/utils';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { SkeletonDetail } from '../../../components/Skeleton';
import { Button } from '../../../components/Button';
import { FullscreenGallery } from '../../../components/client/FullscreenGallery';
import { ImageCaption } from '../../../components/client/ImageCaption';
import { useContentWidth } from '../../../lib/use-breakpoint';
import { useFeedPost } from '../../../lib/consumer-queries';
import { config } from '../../../lib/config';
import { useAuth } from '../../../lib/auth-context';
import { useDialog } from '../../../lib/dialog';
import { spacing, radii, useThemeColors } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';

export default function DesignDetail() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { colors: atelier } = useAtelierTheme();
  const dialog = useDialog();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const postQ = useFeedPost(id);
  const post = postQ.data?.post;
  const more = postQ.data?.moreLikeThis ?? [];

  // Lifted out of the carousel so the gallery opens on the angle you were
  // looking at, and closing it returns you to the angle you swiped to.
  const [heroIndex, setHeroIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);

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
      pathname: '/(client)/discover/inquire',
      params: {
        designId: post.id,
        tailorId: post.tailor.id,
        tailorName: post.tailor.businessName,
        // Carried as params rather than refetched: this screen already holds
        // the post, and the enquiry screen only needs them to write a sentence.
        designName: post.title ?? post.caption ?? post.garmentType ?? '',
        designPrice: post.startingPrice
          ? formatCurrency(Number(post.startingPrice), post.currency ?? 'XAF')
          : '',
      },
    });
  };

  // Share the design OUTSIDE the app — hands the OS share sheet a link to the
  // server-rendered /d/<id> page, which previews the dress on WhatsApp/FB/etc.
  const onShare = async () => {
    if (!post) return;
    const url = `${config.webUrl}/d/${post.id}`;
    try {
      await Share.share({ message: url, url });
    } catch {
      /* user dismissed the sheet */
    }
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
          <HeroCarousel
            images={post.images}
            background={colors.card}
            accent={colors.accent}
            index={heroIndex}
            onIndexChange={setHeroIndex}
            onOpen={() => setGalleryOpen(true)}
            openLabel={t('discover.viewFullScreen')}
          />

          {/* Close, top-left — deliberately not where the attribution goes. */}
          <Pressable
            onPress={() => router.back()}
            style={styles.close}
            accessibilityLabel="Close"
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>

          {/* Share out of the app, top-right. */}
          <Pressable
            onPress={() => void onShare()}
            style={styles.share}
            accessibilityLabel={t('discover.share')}
          >
            <Ionicons name="share-outline" size={20} color="#fff" />
          </Pressable>

          {/* ── Tailor attribution overlay ── */}
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/discover/tailor/[tailorId]',
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
          {post.title ? <Text variant="h3">{post.title}</Text> : null}
          {post.caption && post.caption !== post.title ? (
            <Text variant="body">{post.caption}</Text>
          ) : null}

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
              {/* Through Intl, not string concatenation. XAF has no minor unit,
                  so the raw "45000.00" has to print as FCFA 45,000 — showing
                  the stored decimals is showing a figure no bill ever has. */}
              {t('discover.fromPrice', {
                price: formatCurrency(Number(post.startingPrice), post.currency ?? 'XAF'),
              })}
            </Text>
          ) : null}

          <View style={styles.cta}>
            <Button label={t('discover.inquire')} onPress={inquire} />
          </View>
        </View>

        {more.length > 0 ? <MoreLikeThis posts={more} title={t('discover.moreLikeThis')} /> : null}
      </ScrollView>

      <FullscreenGallery
        images={post.images}
        visible={galleryOpen}
        startIndex={heroIndex}
        onIndexChange={setHeroIndex}
        onClose={() => setGalleryOpen(false)}
      />
    </Screen>
  );
}

/**
 * The grid under the enquiry button. Two columns, each cell at the design's own
 * proportions, captioned inside the image the way the main feed does it — so it
 * reads as "more of the feed", not as a separate, lesser widget.
 *
 * `router.push` rather than replace: going from one design to another and back
 * should retrace your steps, which is how people browse rails of related work.
 */
function MoreLikeThis({ posts, title }: { posts: FeedPostPublic[]; title: string }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const contentWidth = useContentWidth();
  const gap = spacing.md;
  const cellW = (contentWidth - spacing.lg * 2 - gap) / 2;

  // Masonry by shortest column, so tall and wide photos interleave instead of
  // leaving ragged gaps under the short ones.
  const cols: FeedPostPublic[][] = [[], []];
  const heights = [0, 0];
  for (const p of posts) {
    const ratio = p.width && p.height ? p.width / p.height : 1;
    const target = heights[0]! <= heights[1]! ? 0 : 1;
    cols[target]!.push(p);
    heights[target]! += cellW / ratio + gap;
  }

  return (
    <View style={styles.more}>
      <Text variant="h3" style={styles.moreTitle}>
        {title}
      </Text>
      <View style={[styles.moreGrid, { gap }]}>
        {cols.map((col, ci) => (
          <View key={ci} style={{ width: cellW, gap }}>
            {col.map((p) => {
              const ratio = p.width && p.height ? p.width / p.height : 1;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => router.push({ pathname: '/discover/[id]', params: { id: p.id } })}
                  style={{ borderRadius: radii.md, overflow: 'hidden' }}
                >
                  <Image
                    source={{ uri: p.thumbnailUrl }}
                    style={{ width: cellW, height: cellW / ratio, backgroundColor: colors.card }}
                  />
                  <ImageCaption
                    title={p.title}
                    price={
                      p.startingPrice
                        ? t('discover.fromPrice', {
                            price: formatCurrency(Number(p.startingPrice), p.currency ?? 'XAF'),
                          })
                        : null
                    }
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * The design's angles — front, back, side — as a paged swipe.
 *
 * A plain paging ScrollView rather than a carousel library: this is one
 * horizontal strip of at most eight images and the platform already does
 * paging natively. Dots only appear for more than one photo, so a single-image
 * design looks exactly as it did before carousels existed.
 */
function HeroCarousel({
  images,
  background,
  accent,
  index,
  onIndexChange,
  onOpen,
  openLabel,
}: {
  images: FeedImage[];
  background: string;
  accent: string;
  index: number;
  onIndexChange: (i: number) => void;
  onOpen: () => void;
  openLabel: string;
}) {
  const width = Dimensions.get('window').width;
  const listRef = useRef<ScrollView>(null);

  // When the gallery closes on a different angle, bring the hero along so the
  // page shows what you were last looking at.
  useEffect(() => {
    listRef.current?.scrollTo({ x: index * width, animated: false });
  }, [index, width]);

  if (images.length <= 1) {
    return (
      <Pressable onPress={onOpen} accessibilityRole="imagebutton" accessibilityLabel={openLabel}>
        <Image
          source={{ uri: images[0]?.imageUrl }}
          style={[styles.hero, { backgroundColor: background }]}
          resizeMode="cover"
        />
        <ExpandHint />
      </Pressable>
    );
  }

  return (
    <View>
      <ScrollView
        ref={listRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          onIndexChange(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {images.map((img) => (
          <Pressable
            key={img.position}
            onPress={onOpen}
            accessibilityRole="imagebutton"
            accessibilityLabel={openLabel}
          >
            <Image
              source={{ uri: img.imageUrl }}
              style={[styles.hero, { width, backgroundColor: background }]}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </ScrollView>

      <ExpandHint />

      <View style={styles.dots} pointerEvents="none">
        {images.map((img, i) => (
          <View
            key={img.position}
            style={[
              styles.dot,
              i === index
                ? { width: 16, backgroundColor: accent }
                : { backgroundColor: 'rgba(255,255,255,0.6)' },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * A quiet corner glyph saying "this opens bigger". Without it nobody discovers
 * the gallery — a photo that happens to be tappable looks exactly like one
 * that is not.
 */
function ExpandHint() {
  return (
    <View style={styles.expand} pointerEvents="none">
      <Ionicons name="expand-outline" size={16} color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
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
  share: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
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
  // Sits above the attribution card and clear of the share button's corner.
  expand: {
    position: 'absolute',
    right: spacing.md,
    top: 60,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  more: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 },
  moreTitle: { marginBottom: spacing.md },
  moreGrid: { flexDirection: 'row', alignItems: 'flex-start' },
});
