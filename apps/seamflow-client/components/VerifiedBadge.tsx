// ============================================================================
// The verified mark, and the sentence behind it (appendix J.5).
//
// "A tick nobody can interrogate is decoration." A mark that clients read as
// "SeamFlow checked this person" has to be able to say WHAT was checked, or it
// is borrowed credibility with nothing underneath. So this is never just an
// icon: it is a button, and tapping it says what we confirmed and when.
//
// WHY IT FETCHES ON TAP RATHER THAN ON RENDER
//
// A Discover feed renders twenty of these. Loading each one's detail up front
// would be twenty requests to draw twenty ticks nobody has asked about yet, on
// connections where that is the difference between a feed that loads and one
// that does not. The `isVerified` flag needed to DRAW the mark already arrives
// with the shop; only the detail is fetched, only when someone asks for it.
//
// Renders nothing at all when the shop is not verified, so call sites can drop
// it in unconditionally.
// ============================================================================

import { useState } from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { useDialog } from '../lib/dialog';
import { useTranslation } from '../lib/i18n';
import { formatMonthYear } from '../lib/month-year';

export interface VerifiedBadgeProps {
  tailorId: string;
  isVerified: boolean;
  size?: number;
  color: string;
  /** Extra tap area, for a mark sitting on a photo rather than in a row. */
  hitSlop?: number;
}

export function VerifiedBadge({
  tailorId,
  isVerified,
  size = 18,
  color,
  hitSlop = 8,
}: VerifiedBadgeProps) {
  const { t, language } = useTranslation();
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);

  if (!isVerified) return null;

  const explain = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const badge = await api.verification.badge(tailorId);
      const verifiedOn = formatMonthYear(badge.verifiedAt, language);
      const joined = formatMonthYear(badge.memberSince, language);

      // Built as lines rather than one sentence so a missing fact simply
      // disappears. A badge granted before appendix J has no verifiedAt, and
      // claiming a date we do not have would be the exact dishonesty this
      // screen exists to prevent.
      const lines = [
        // Work first: it is the claim clients actually care about.
        verifiedOn
          ? t('verification.badgeWorkOn', { date: verifiedOn })
          : t('verification.badgeWork'),
        badge.phoneConfirmed ? t('verification.badgePhone') : null,
        joined ? t('verification.badgeSince', { date: joined }) : null,
        // Trust signals (phase 2). Shown beside the badge, never part of
        // earning it — a shop verified on its first day has a badge and no
        // history, and both readings are correct. Omitted at zero rather than
        // rendered as "0 orders", which would read as a verdict on a newcomer.
        badge.completedOrders > 0
          ? t(
              badge.completedOrders === 1
                ? 'verification.badgeOrdersOne'
                : 'verification.badgeOrders',
              { count: badge.completedOrders },
            )
          : null,
        badge.responseTimeHours != null
          ? t('verification.badgeReplies', { hours: badge.responseTimeHours })
          : null,
      ].filter(Boolean) as string[];

      await dialog.alert({
        title: t('verification.badgeTitle'),
        message: `${lines.join('\n')}\n\n${t('verification.badgeFootnote')}`,
        tone: 'info',
      });
    } catch {
      // The detail is a nicety; failing to load it must not look like an error
      // in the shop being viewed. Say the plain thing the mark already means.
      await dialog.alert({
        title: t('verification.badgeTitle'),
        message: t('verification.badgeWork'),
        tone: 'info',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={explain}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={t('verification.badgeTitle')}
    >
      <Ionicons name="checkmark-circle" size={size} color={color} />
    </Pressable>
  );
}
