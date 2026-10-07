// ============================================================================
// Reporting a design, a shop or a message.
//
// One function rather than a component, because the three places this is
// reached from already have a menu, a sheet or a header — and a fourth bespoke
// screen would be the one inconsistency on the path. It is built from the
// dialogs the rest of the app uses, so it looks like everything else and
// inherits the keyboard, theme and reduced-motion handling for free.
//
// THE SHAPE IS: PICK A REASON, ADD A WORD IF YOU WANT, DONE.
//
// Two taps to the common case. A report form that asks for an explanation
// before it will accept anything is a form people abandon, and an abandoned
// report is indistinguishable from content nobody minded. The note is offered
// second and may be left empty.
//
// It never says whether anything happened as a result. A reporter is not owed
// the outcome of a review about someone else, and promising one we might not
// deliver is worse than thanking them plainly.
// ============================================================================

import type { ReportReason, ReportTarget } from '@seamflow/schemas';
import { REPORT_REASONS } from '@seamflow/schemas';
import { api } from './api';
import type { DialogApi } from './dialog';
import { haptics } from './haptics';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Run the whole flow. Resolves true when a report was filed.
 *
 * Returns rather than throwing on cancel, so callers can treat "they changed
 * their mind" as the ordinary outcome it is.
 */
export async function reportContent(
  dialog: DialogApi,
  t: Translate,
  target: ReportTarget,
  targetId: string,
): Promise<boolean> {
  const reason = (await dialog.pick({
    title: t(`report.title_${target}`),
    options: REPORT_REASONS.map((key) => ({
      key,
      label: t(`report.reason_${key}`),
    })),
  })) as ReportReason | null;
  if (!reason) return false;

  // Optional on purpose — `requireValue: false` is the whole point of asking
  // second. Cancelling here cancels the report, which is why the copy says
  // what the button will do.
  const note = await dialog.prompt({
    title: t('report.noteTitle'),
    message: t('report.noteBody'),
    placeholder: t('report.notePlaceholder'),
    confirmLabel: t('report.send'),
    requireValue: false,
  });
  if (note === null) return false;

  try {
    await api.moderation.report({
      target,
      targetId,
      reason,
      note: note.trim() || undefined,
    });
    haptics.success();
    await dialog.alert({
      title: t('report.sentTitle'),
      message: t('report.sentBody'),
      tone: 'success',
    });
    return true;
  } catch (err) {
    haptics.error();
    await dialog.error(err);
    return false;
  }
}

/**
 * Block someone, behind a confirm that says what it actually does.
 *
 * The confirm matters: people expect "block" to mean different things on
 * different apps, and here it is symmetric — neither of you can message the
 * other afterwards. Saying so before, rather than discovering it later, is the
 * difference between a tool and a surprise.
 */
export async function blockUser(
  dialog: DialogApi,
  t: Translate,
  userId: string,
  name: string,
): Promise<boolean> {
  const ok = await dialog.confirm({
    title: t('report.blockTitle', { name }),
    message: t('report.blockBody'),
    confirmLabel: t('report.blockAction'),
    destructive: true,
  });
  if (!ok) return false;

  try {
    await api.moderation.block(userId);
    haptics.success();
    return true;
  } catch (err) {
    haptics.error();
    await dialog.error(err);
    return false;
  }
}
