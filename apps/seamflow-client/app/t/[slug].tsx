// ============================================================================
// /t/<slug> — the shared catalogue link, opened inside the app.
//
// This is the same URL a browser would render at
// www.seamflowtech.com/t/<slug>. When the app is installed, Android App Links
// (and, once the Apple Developer Program is paid, iOS Universal Links) hand
// the URL here instead of to Chrome; when it isn't, the web page serves it.
// Same slug, same endpoint, same shop — the only difference is which surface
// draws it.
//
// Deliberately outside `(app)`: a deep link has to render for someone who
// installed the app thirty seconds ago and has no session. Anything behind the
// auth group would bounce them to sign-in, which is precisely the wrong first
// screen for a link a tailor sent their customer.
// ============================================================================

import { router, useLocalSearchParams } from 'expo-router';
import { StorefrontView } from '../../components/StorefrontView';
import { useCatalogue } from '../../lib/queries';
import { useAuth } from '../../lib/auth-context';
import { useDialog } from '../../lib/dialog';
import { useTranslation } from '../../lib/i18n';

export default function Catalogue() {
  const { t } = useTranslation();
  const dialog = useDialog();
  const { session } = useAuth();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const q = useCatalogue(slug ?? '');
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
      // A mistyped or retired slug lands here rather than on a blank shop.
      notFound={q.isError}
      notFoundLabel={t('discover.catalogueNotFound')}
    />
  );
}
