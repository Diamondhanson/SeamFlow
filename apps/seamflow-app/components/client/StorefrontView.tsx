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
//
// THE HEADER IS A SHOPFRONT, NOT A FORM
// It used to be the business name twice (once in the header bar, once as a
// heading beneath it), a line of dot-separated facts, a row of chips reading
// "buba_wrapper" and "kids_outfit", and a button saying "Ask about this" on a
// page with no "this" to ask about. It is the first thing a client sees of a
// maker they are deciding whether to trust, so it now works like the front of
// a shop:
//
//   · a cover band washed in the tailor's own photo — blurred, so any upload
//     works as a backdrop without needing a purpose-made banner
//   · their face or logo, large, breaking over the band's edge; their initials
//     on a tone derived from their name when they have not uploaded one, so
//     every shop still looks deliberate rather than missing a picture
//   · the name once
//   · facts as icon + phrase instead of a run-on line
//   · a few numbers a client actually weighs — how much work, how long here
//   · what they make, in words, in the reader's language
//   · "Message" as the action, and a way to pass the shop on
//
// And it scrolls. The old header was pinned and only the grid moved beneath
// it, so on a phone the facts about the maker permanently ate half the screen
// their work should have had.
// ============================================================================

import { Image, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  garmentLabel,
  type FeedPostPublic,
  type GarmentLang,
  type TailorPublicProfile,
} from '@seamflow/schemas';
import { formatCurrency } from '@seamflow/utils';
import {
  Text,
  avatarToneFor,
  initialsFor,
  useAtelierTheme,
  withAlpha,
} from '@seamflow/ui';
import { Screen } from '../Screen';
import { ScreenHeader } from '../ScreenHeader';
import { SkeletonGrid } from '../Skeleton';
import { ImageCaption } from './ImageCaption';
import { Button } from '../Button';
import { useGridColumns, useContentWidth } from '../../lib/use-breakpoint';
import { useFloatingScroll } from '../../lib/floating-scroll';
import { config } from '../../lib/config';
import { spacing, radii, useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

export interface StorefrontViewProps {
  tailor: TailorPublicProfile | undefined;
  posts: FeedPostPublic[];
  isLoading: boolean;
  onInquire: () => void;
  /** Rendered under the CTA — the deep-link route uses it for "not found". */
  notFound?: boolean;
  notFoundLabel?: string;
}

const COVER_H = 150;
const AVATAR = 104;
const RING = 4;

export function StorefrontView({
  tailor,
  posts,
  isLoading,
  onInquire,
  notFound,
  notFoundLabel,
}: StorefrontViewProps) {
  const { t, language } = useTranslation();
  const lang: GarmentLang = (['en', 'fr', 'pt', 'es', 'sw', 'ar'] as const).includes(
    language as never,
  )
    ? (language as GarmentLang)
    : 'en';
  const colors = useThemeColors();
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

  // Masonry by shortest column: the old wrap grid left ragged holes under
  // landscape shots, which is a poor frame for someone's portfolio.
  const cols: FeedPostPublic[][] = Array.from({ length: columns }, () => []);
  const heights = new Array<number>(columns).fill(0);
  for (const post of posts) {
    const ratio = post.width && post.height ? post.width / post.height : 1;
    let target = 0;
    for (let i = 1; i < columns; i++) if (heights[i]! < heights[target]!) target = i;
    cols[target]!.push(post);
    heights[target]! += cellW / ratio + gap;
  }

  return (
    <Screen padded={false} width="wide">
      <ScrollView {...scroll} showsVerticalScrollIndicator={false}>
        {tailor ? (
          <ShopHeader
            tailor={tailor}
            designCount={posts.length}
            lang={lang}
            onInquire={onInquire}
          />
        ) : (
          // Keep the way back available while the profile is still loading.
          <View style={styles.padded}>
            <ScreenHeader title="" />
          </View>
        )}

        <View style={styles.padded}>
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
          <View style={[styles.grid, { gap }]}>
            {cols.map((col, ci) => (
              <View key={ci} style={{ width: cellW, gap }}>
                {col.map((post) => {
                  const ratio = post.width && post.height ? post.width / post.height : 1;
                  return (
                    <Pressable
                      key={post.id}
                      onPress={() =>
                        router.push({ pathname: '/discover/[id]', params: { id: post.id } })
                      }
                      style={{ borderRadius: radii.md, overflow: 'hidden' }}
                    >
                      <Image
                        source={{ uri: post.thumbnailUrl }}
                        style={{
                          width: cellW,
                          height: cellW / ratio,
                          backgroundColor: colors.card,
                        }}
                      />
                      {/* A design with several angles says so on the tile —
                          otherwise the extra photos are invisible until someone
                          happens to open it, and most people never would. */}
                      {post.images.length > 1 ? (
                        <View style={styles.countBadge}>
                          <Ionicons name="copy-outline" size={11} color="#fff" />
                          <Text variant="caption" style={styles.countText}>
                            {post.images.length}
                          </Text>
                        </View>
                      ) : null}
                      <ImageCaption
                        title={post.title}
                        price={
                          post.startingPrice
                            ? t('discover.fromPrice', {
                                price: formatCurrency(
                                  Number(post.startingPrice),
                                  post.currency ?? tailor?.currency ?? 'XAF',
                                ),
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
        )}
      </ScrollView>
    </Screen>
  );
}

// ── The shopfront ──────────────────────────────────────────────────────────

function ShopHeader({
  tailor,
  designCount,
  lang,
  onInquire,
}: {
  tailor: TailorPublicProfile;
  designCount: number;
  lang: GarmentLang;
  onInquire: () => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { colors: atelier } = useAtelierTheme();

  // The same name always gets the same tone, everywhere Avatar is used — so
  // this shop's colour here matches its initials in a chat list.
  const tone = atelier[avatarToneFor(tailor.businessName)] as string;

  const back = () => {
    // /t/<slug> is usually opened cold from a WhatsApp link, with nothing
    // behind it in the stack. Going "back" there must land somewhere real.
    if (router.canGoBack()) router.back();
    else router.replace('/discover');
  };

  const shareShop = async () => {
    if (!tailor.slug) return;
    const url = `${config.webUrl}/t/${tailor.slug}`;
    try {
      await Share.share({ message: url, url });
    } catch {
      /* dismissed */
    }
  };

  const since = new Date(tailor.memberSince).getFullYear();

  const facts: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [];
  if (tailor.city) facts.push({ icon: 'location-outline', text: tailor.city });
  if (tailor.acceptsRemote) facts.push({ icon: 'globe-outline', text: t('discover.acceptsRemote') });
  if (tailor.responseTimeHours != null) {
    facts.push({
      icon: 'time-outline',
      text: t('discover.repliesIn', { hours: tailor.responseTimeHours }),
    });
  }

  return (
    <View>
      {/* ---- Cover band ------------------------------------------------ */}
      <View style={[styles.cover, { backgroundColor: withAlpha(tone, 0.22) }]}>
        {tailor.avatarUrl ? (
          <>
            {/* Their own photo, blurred into a backdrop. Any upload works —
                a face, a logo, a shopfront — without needing a banner made
                for the purpose, and the band takes on its colours. */}
            <Image
              source={{ uri: tailor.avatarUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              blurRadius={28}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />
          </>
        ) : (
          // No photo: two soft washes of their tone, offset, so the band has
          // depth instead of reading as a flat placeholder rectangle.
          <>
            <View style={[styles.blob, styles.blobA, { backgroundColor: withAlpha(tone, 0.35) }]} />
            <View style={[styles.blob, styles.blobB, { backgroundColor: withAlpha(tone, 0.2) }]} />
          </>
        )}

        <Pressable
          onPress={back}
          style={[styles.roundBtn, styles.roundBtnLeft]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>

        {tailor.slug ? (
          <Pressable
            onPress={() => void shareShop()}
            style={[styles.roundBtn, styles.roundBtnRight]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('discover.shareShop')}
          >
            <Ionicons name="share-outline" size={20} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      {/* ---- Identity -------------------------------------------------- */}
      <View style={styles.identity}>
        <View
          style={[
            styles.avatarRing,
            { backgroundColor: colors.bg, borderColor: colors.bg },
          ]}
        >
          {tailor.avatarUrl ? (
            <Image
              source={{ uri: tailor.avatarUrl }}
              style={styles.avatarImg}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={[styles.avatarImg, styles.initials, { backgroundColor: withAlpha(tone, 0.18) }]}>
              <Text variant="h2" style={{ color: tone }}>
                {initialsFor(tailor.businessName)}
              </Text>
            </View>
          )}
          {tailor.isVerified ? (
            <View style={[styles.verified, { backgroundColor: colors.bg }]}>
              <Ionicons name="checkmark-circle" size={24} color={atelier.primary} />
            </View>
          ) : null}
        </View>

        <Text variant="h2" style={styles.name}>
          {tailor.businessName}
        </Text>

        {facts.length > 0 ? (
          <View style={styles.facts}>
            {facts.map((f) => (
              <View key={f.icon} style={styles.fact}>
                <Ionicons name={f.icon} size={14} color={colors.textMuted} />
                <Text variant="bodySm" tone="textMuted">
                  {f.text}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ---- Numbers a client actually weighs ---------------------- */}
        <View style={[styles.stats, { borderColor: colors.hairline }]}>
          <Stat value={String(designCount)} label={t('discover.statDesigns')} />
          <View style={[styles.statDivider, { backgroundColor: colors.hairline }]} />
          <Stat value={String(since)} label={t('discover.statSince')} />
          {tailor.followerCount > 0 ? (
            <>
              <View style={[styles.statDivider, { backgroundColor: colors.hairline }]} />
              <Stat value={String(tailor.followerCount)} label={t('discover.statFollowers')} />
            </>
          ) : null}
        </View>

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
                style={[styles.tag, { backgroundColor: withAlpha(tone, 0.12), borderRadius: radii.lg }]}
              >
                <Text variant="caption" style={{ color: colors.text }}>
                  {/* Specialties are taxonomy KEYS ("buba_wrapper") — render the
                      reader's own word for them, never the key itself. */}
                  {garmentLabel(sp, lang)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.cta}>
          <Button
            label={t('discover.messageTailor')}
            onPress={onInquire}
            iconStart={<Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.accentText} />}
          />
        </View>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="h3">{value}</Text>
      <Text variant="caption" tone="textMuted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

  cover: { height: COVER_H, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999 },
  blobA: { width: 260, height: 260, top: -120, right: -60 },
  blobB: { width: 200, height: 200, bottom: -120, left: -40 },
  // Fixed dark scrim rather than a theme token: it sits over an arbitrary
  // photo, so it has to stay legible in light mode too.
  roundBtn: {
    position: 'absolute',
    top: spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  // Each side set explicitly, never by "unsetting" the other. On web a
  // `left: undefined` override does not remove the base `left`, so both
  // buttons stacked in the top-left corner and share hid the way back.
  roundBtnLeft: { left: spacing.md },
  roundBtnRight: { right: spacing.md },

  identity: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    // Pull the avatar up so it breaks over the band's lower edge.
    marginTop: -(AVATAR / 2 + RING),
    marginBottom: spacing.lg,
  },
  avatarRing: {
    width: AVATAR + RING * 2,
    height: AVATAR + RING * 2,
    borderRadius: (AVATAR + RING * 2) / 2,
    borderWidth: RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  initials: { alignItems: 'center', justifyContent: 'center' },
  verified: { position: 'absolute', right: 2, bottom: 2, borderRadius: 14, padding: 1 },
  name: { marginTop: spacing.md, textAlign: 'center' },

  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: spacing.md,
    rowGap: 4,
    marginTop: spacing.sm,
  },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'space-evenly',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  stat: { alignItems: 'center', flex: 1 },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },

  bio: { marginTop: spacing.lg, textAlign: 'center' },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tag: { paddingHorizontal: spacing.md, paddingVertical: 6 },
  cta: { alignSelf: 'stretch', marginTop: spacing.lg },

  worksTitle: { marginBottom: spacing.sm },
  grid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  empty: { alignItems: 'center', paddingTop: spacing.xl },
  countBadge: {
    position: 'absolute',
    right: 6,
    top: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  countText: { color: '#fff' },
});
