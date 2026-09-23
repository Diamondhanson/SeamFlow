// ============================================================================
// Turning a 402 into an offer (ROADMAP appendix I.9).
//
// The server refuses a gated action with HTTP 402 and a body naming either the
// premium FEATURE or the CAP that was hit. This maps that into the words a
// tailor should read — including, every time, the sentence that answers what
// they are actually worried about: nothing you saved has gone anywhere.
// ============================================================================

import type { CapKind, PremiumFeature } from '@seamflow/schemas';

type Translate = (key: string, params?: Record<string, string | number>) => string;

interface UpgradeBody {
  error: 'upgrade_required';
  feature: PremiumFeature | null;
  cap: CapKind | null;
  limit: number | null;
}

function bodyOf(err: unknown): UpgradeBody | null {
  if (!err || typeof err !== 'object') return null;
  const status = (err as { status?: unknown }).status;
  if (status !== 402) return null;
  const body = (err as { body?: unknown }).body as Partial<UpgradeBody> | undefined;
  if (body?.error !== 'upgrade_required') return null;
  return { error: 'upgrade_required', feature: body.feature ?? null, cap: body.cap ?? null, limit: body.limit ?? null };
}

export interface UpgradePromptCopy {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

/** Copy for a blocked action, or null when this error is an ordinary failure. */
export function upgradePrompt(err: unknown, t: Translate): UpgradePromptCopy | null {
  const body = bodyOf(err);
  if (!body) return null;

  const reason = body.cap
    ? t(`billing.blockedCap_${body.cap}`, { limit: body.limit ?? 0 })
    : body.feature
      ? t(`billing.blockedFeature_${body.feature}`)
      : '';

  return {
    title: body.cap ? t('billing.freeTitle') : t('billing.blockedTitle'),
    // The reassurance is part of the message, not a footnote: this dialog is
    // the moment a tailor decides whether SeamFlow can be trusted with a year
    // of their work.
    message: `${reason}\n\n${t('billing.blockedKeepData')}`,
    confirmLabel: t('billing.seePlans'),
    cancelLabel: t('billing.dismiss'),
  };
}
