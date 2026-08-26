// ============================================================================
// A tailor's storefront, reached by id from the feed (ROADMAP D.6.5).
//
// The layout lives in <StorefrontView> because the same shop is also reachable
// by slug at /t/<slug> from a shared catalogue link. This file owns only the
// lookup and the inquire flow.
//
// Public: no session required, same as the feed.
// ============================================================================

import { router, useLocalSearchParams } from 'expo-router';
import { StorefrontView } from '../../../components/StorefrontView';
import { useStorefront } from '../../../lib/queries';
import { useAuth } from '../../../lib/auth-context';
import { useDialog } from '../../../lib/dialog';
import { useTranslation } from '../../../lib/i18n';

export default function Storefront() {
  const { t } = useTranslation();
  const dialog = useDialog();
  const { session } = useAuth();
  const { tailorId } = useLocalSearchParams<{ tailorId: string }>();

  const q = useStorefront(tailorId);
  const tailor = q.data?.tailor;

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
    <StorefrontView
      tailor={tailor}
      posts={q.data?.posts.items ?? []}
      isLoading={q.isLoading}
      onInquire={inquire}
    />
  );
}
