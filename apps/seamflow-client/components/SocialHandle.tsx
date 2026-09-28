// ============================================================================
// A confirmed social account, on a client-facing profile (appendix J phase 3).
//
// This is the one of J's three optional extras that a CLIENT ever sees, and
// that is the whole reason it is worth asking a tailor for. The bio-code dance
// is evidence to us; the handle on their storefront is what they get out of it.
// An extra that only ever helped SeamFlow would not be worth anyone's five
// minutes.
//
// Renders NOTHING when there is no confirmed account — never a greyed-out icon
// or an "add your Instagram" prompt on someone else's shop. A shop without one
// has not failed anything; most shops will not have one.
//
// The handle is tappable and opens the real profile. Two consequences worth
// naming: it sends a client out of SeamFlow, and it is the tailor's own
// audience they are being sent to. Both are fine, and both are the point — a
// tailor who gains followers from their SeamFlow storefront has a reason to
// keep the storefront good.
// ============================================================================

import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { spacing } from '../lib/theme';

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok';

/**
 * Only these three, and the filter is whether a STRANGER can read the account's
 * bio without an account or a follow — that is what makes the bio-code check
 * possible at all. It is why WhatsApp and Snapchat are absent despite being
 * enormous here, and why the opt-in public WhatsApp number is a separate field.
 */
const ICONS: Record<SocialPlatform, keyof typeof Ionicons.glyphMap> = {
  instagram: 'logo-instagram',
  facebook: 'logo-facebook',
  tiktok: 'logo-tiktok',
};

const URLS: Record<SocialPlatform, (handle: string) => string> = {
  instagram: (h) => `https://instagram.com/${h}`,
  facebook: (h) => `https://facebook.com/${h}`,
  // TikTok is the odd one: the @ is part of the path, not decoration.
  tiktok: (h) => `https://tiktok.com/@${h}`,
};

export interface SocialHandleProps {
  social: { platform: SocialPlatform; handle: string } | null | undefined;
  size?: number;
}

export function SocialHandle({ social, size = 16 }: SocialHandleProps) {
  const { colors } = useAtelierTheme();
  if (!social) return null;

  const open = () => {
    void Linking.openURL(URLS[social.platform](social.handle)).catch(() => undefined);
  };

  return (
    <Pressable onPress={open} hitSlop={8} accessibilityRole="link">
      <View style={styles.row}>
        <Ionicons name={ICONS[social.platform]} size={size} color={colors.textMuted} />
        {/* The @ is shown but never stored — two tailors must not be able to
            differ by a glyph nobody can see. */}
        <Text variant="bodySm" tone="textMuted">
          @{social.handle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
