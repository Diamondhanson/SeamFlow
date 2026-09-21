import type { SupportStatus } from '@seamflow/schemas';
import { Chip, type ChipTone } from '@seamflow/ui';
import { useTranslation } from '../../lib/i18n';

/** "Waiting on you" is the one that asks for action, so it gets the warm tone. */
const TONE: Record<SupportStatus, ChipTone> = {
  open: 'statusInProgress',
  waiting_on_user: 'warning',
  resolved: 'success',
};

export function SupportStatusChip({ status }: { status: SupportStatus }) {
  const { t } = useTranslation();
  return <Chip variant="status" tone={TONE[status]} label={t(`support.status_${status}`)} />;
}
