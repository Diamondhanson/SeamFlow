// ============================================================================
// Shops matching a search, above the design grid.
//
// WHY THIS IS A SEPARATE ROW AND NOT MIXED INTO THE GRID
//
// "Show me gold kaftans" and "take me to Gold Kaftan" are different questions,
// and answering both in one grid would mean ranking a shop against a
// photograph — which has no sensible answer. It also keeps the grid's keyset
// pagination untouched.
//
// WHY IT MATTERS MORE THAN IT LOOKS
//
// Word of mouth is how tailors get clients in this market. Someone's sister
// says "go to LYZMA, they made my dress". She opens SeamFlow, types the name,
// and if nothing comes back she goes to WhatsApp instead — and that customer is
// gone at the only moment we had her. This row is the whole of that journey.
//
// A shop with NOTHING published still appears here, which looks wrong until you
// remember why the name was typed: someone was told to. A brand-new shop is
// exactly the one being recommended by hand.
// ============================================================================

import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { FeedShopHit } from '@seamflow/schemas';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { useTranslation } from '../lib/i18n';
import { radii, spacing } from '../lib/theme';

export interface ShopResultsProps {
  shops: FeedShopHit[] | undefined;
  /** Where a shop opens. The two apps route to their own storefront screen. */
  hrefFor: (tailorId: string) => string;
}

export function ShopResults({ shops, hrefFor }: ShopResultsProps) {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  if (!shops?.length) return null;

  return (
    <View style={styles.wrap}>
      <Text variant="caption" tone="textMuted" style={styles.heading}>
        {t('discover.shopsHeading')}
      </Text>
      {shops.map((shop) => (
        <Pressable
          key={shop.id}
          onPress={() => router.push(hrefFor(shop.id) as never)}
          style={[styles.row, { backgroundColor: colors.surface, borderRadius: radii.lg }]}
        >
          {shop.avatarUrl ? (
            <Image source={{ uri: shop.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.initials, { backgroundColor: colors.primarySoft }]}>
              <Text variant="bodySm">{shop.businessName.trim().charAt(0).toUpperCase()}</Text>
            </View>
          )}

          <View style={styles.body}>
            <View style={styles.nameRow}>
              <Text variant="body" numberOfLines={1} style={styles.name}>
                {shop.businessName}
              </Text>
              {/* Not the tappable VerifiedBadge: the whole row is already a
                  press, and a button inside a button is a way to make neither
                  work. The mark is on the storefront this opens. */}
              {shop.isVerified ? (
                <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
              ) : null}
            </View>
            <Text variant="caption" tone="textMuted" numberOfLines={1}>
              {[
                shop.city,
                shop.designCount > 0
                  ? t(
                      shop.designCount === 1
                        ? 'discover.shopDesignsOne'
                        : 'discover.shopDesigns',
                      { count: shop.designCount },
                    )
                  : t('discover.shopNoDesigns'),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  heading: { textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  initials: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { flexShrink: 1 },
});
