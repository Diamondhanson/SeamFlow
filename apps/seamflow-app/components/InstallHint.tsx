// ============================================================================
// <InstallHint> — iOS-only "Add to Home Screen" nudge.
//
// Android/Chrome shows its own install prompt; iOS Safari never does, so an
// iPhone tester would otherwise never discover that SeamFlow can be installed.
// Shown once (dismissal remembered via GuidesProvider), only on iOS Safari,
// and never when already running standalone.
// ============================================================================

import { HelpCard } from './HelpCard';
import { isIosSafariBrowser } from '../lib/pwa';
import { useTranslation } from '../lib/i18n';

export function InstallHint() {
  const { t } = useTranslation();
  if (!isIosSafariBrowser()) return null;
  return (
    <HelpCard
      guideKey="web.installHint"
      icon="phone-portrait-outline"
      title={t('misc.installHintTitle')}
      message={t('misc.installHintBody')}
    />
  );
}
