import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useClaimOrder, extractShareCode } from '../../lib/queries';
import { useDialog } from '../../lib/dialog';
import { spacing } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

export default function ClaimOrder() {
  const { t } = useTranslation();
  const dialog = useDialog();
  const claim = useClaimOrder();
  const [input, setInput] = useState('');

  const submit = async () => {
    const code = extractShareCode(input);
    if (!code) {
      await dialog.alert({ title: t('claim.emptyInput'), message: t('claim.subtitle'), tone: 'warning' });
      return;
    }
    try {
      const order = await claim.mutateAsync(code);
      await dialog.alert({ title: t('claim.successTitle'), message: t('claim.successBody'), tone: 'success' });
      // Land on the order we just claimed.
      router.replace(`/(app)/orders/${order.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('claim.failedTitle');
      await dialog.alert({ title: t('claim.failedTitle'), message: msg, tone: 'error' });
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader title={t('claim.title')} />
      <View style={styles.body}>
        <Text variant="bodySm" tone="textMuted" style={styles.subtitle}>{t('claim.subtitle')}</Text>
        <Input
          label={t('claim.inputLabel')}
          value={input}
          onChangeText={setInput}
          placeholder={t('claim.placeholder')}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button
          label={t('claim.addBtn')}
          onPress={submit}
          loading={claim.isPending}
          disabled={claim.isPending || input.trim().length === 0}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: spacing.md },
  subtitle: { marginBottom: spacing.lg },
});
