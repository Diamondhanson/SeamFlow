import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { SkeletonForm } from '../../../components/Skeleton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Button } from '../../../components/Button';
import { FabricForm } from '../../../components/FabricForm';
import {
  useDeleteFabric,
  useFabric,
  useMe,
  useUpdateFabric,
} from '../../../lib/queries';
import { spacing } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';

export default function FabricDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: fabric, isLoading } = useFabric(id);
  const update = useUpdateFabric(id);
  const del = useDeleteFabric(id);
  const { data: me } = useMe();
  const { t } = useTranslation();
  const dialog = useDialog();

  const onDelete = async () => {
    const ok = await dialog.confirm({
      title: t('fabrics.deleteConfirmTitle'),
      message: t('fabrics.deleteConfirmBody', { name: fabric?.name ?? '' }),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;
    del.mutate(undefined, {
      onSuccess: () => router.back(),
      onError: (err) => void dialog.error(err),
    });
  };

  return (
    <Screen>
      <ScreenHeader title={fabric?.name ?? t('fabrics.detailTitle')} />
      {isLoading && !fabric ? (
        <SkeletonForm fields={6} />
      ) : fabric ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          <FabricForm
            // Re-mount when the server row changes so fields re-seed.
            key={`${fabric.id}-${fabric.updatedAt}`}
            tailorId={me?.tailor?.id}
            submitLabel={t('fabrics.saveFabric')}
            submitting={update.isPending}
            initial={{
              name: fabric.name,
              supplier: fabric.supplier,
              color: fabric.color,
              composition: fabric.composition,
              yardageMeters: fabric.yardageMeters,
              costPerMeter: fabric.costPerMeter,
              photo: {
                photoKey: fabric.photoKey,
                photoThumbKey: fabric.photoThumbKey,
                photoUrl: fabric.photoUrl,
                photoThumbUrl: fabric.photoThumbUrl,
              },
            }}
            onSubmit={(payload) =>
              update.mutate(payload, {
                onSuccess: () => router.back(),
                onError: (err) => void dialog.error(err),
              })
            }
            footer={
              <View style={styles.section}>
                <Button
                  label={t('fabrics.deleteFabric')}
                  variant="danger"
                  onPress={onDelete}
                  loading={del.isPending}
                />
              </View>
            }
          />
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { textAlign: 'center', marginTop: spacing.xl },
  section: { marginTop: spacing.md },
});
