import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FabricForm } from '../../../components/FabricForm';
import { useCreateFabric, useMe } from '../../../lib/queries';
import { spacing } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';

export default function NewFabric() {
  const create = useCreateFabric();
  const { data: me } = useMe();
  const { t } = useTranslation();
  const dialog = useDialog();

  return (
    <Screen>
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
          onSubmit={(payload) =>
            create.mutate(payload, {
              onSuccess: () => router.back(),
              onError: (err) => void dialog.error(err),
            })
          }
        />
      </ScrollView>
    </Screen>
  );
}
