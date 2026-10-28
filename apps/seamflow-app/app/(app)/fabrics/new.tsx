import { ScrollView } from '../../../components/EdgeScroll';
import { router } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FabricForm } from '../../../components/FabricForm';
import { useCreateFabric, useMe } from '../../../lib/queries';
import { deliverFabric } from '../../../lib/fabric-handoff';
import { spacing } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';
import { useSubmitOnce } from '../../../lib/use-submit-once';

export default function NewFabric() {
  const create = useCreateFabric();
  const begin = useSubmitOnce();
  const { data: me } = useMe();
  const { t } = useTranslation();
  const dialog = useDialog();

  return (
    <Screen bleed>
      <ScreenHeader title={t('fabrics.newTitle')} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <FabricForm
          tailorId={me?.tailor?.id}
          submitLabel={t('fabrics.saveFabric')}
          submitting={create.isPending}
          onSubmit={(payload) => {
            const release = begin();
            if (!release) return;
            create.mutate(payload, {
              onSuccess: (fabric) => {
                // If a fabric picker sent them here, hand the new fabric back
                // so it arrives already attached to the order they were on.
                // A no-op when they came from the Fabrics library instead.
                deliverFabric(fabric.id);
                router.back();
              },
              onError: (err) => {
                release();
                void dialog.error(err);
              },
            });
          }}
        />
      </ScrollView>
    </Screen>
  );
}
