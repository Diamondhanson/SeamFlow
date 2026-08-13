// ============================================================================
// Closing your account — consumer side.
//
// Same policy obligation as the tailor app (App Store 5.1.1(v), Google Play
// data deletion) and the same API behind it, but a different weight: a client
// leaving loses their own requests, offers and saved measurements, not a
// business's books. So the ceremony is a little lighter — no export step is
// pushed on them, though it is offered — while the two protections that stop
// an ACCIDENTAL deletion stay exactly as they are: prove who you are, and type
// something a pocket could not.
//
// SCAFFOLD NOTE. Sign-in exists in this app but is not yet the finished flow.
// Everything below is wired to the real endpoints and works today; the one
// seam is re-authentication, which only knows how to re-check a password. When
// social sign-in lands here, extend `reauthenticate()` the way the tailor app
// does — that function is the whole of what needs to change.
// ============================================================================

import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { useMe } from '../../lib/queries';
import { useDialog } from '../../lib/dialog';
import { useTranslation } from '../../lib/i18n';
import { radii, spacing } from '../../lib/theme';

export default function DeleteAccount() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const dialog = useDialog();
  const { session, signInWithPassword } = useAuth();
  const { data: me, refetch } = useMe();

  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [exporting, setExporting] = useState(false);
  const [working, setWorking] = useState(false);

  const email = session?.user?.email ?? me?.email ?? '';
  const provider = session?.user?.app_metadata?.provider ?? 'email';
  const isPasswordAccount = provider === 'email';

  const matches = !!email && typed.trim().toLowerCase() === email.trim().toLowerCase();
  const canSubmit = matches && (isPasswordAccount ? password.length > 0 : true);

  /**
   * The seam. The API refuses a deletion unless the caller's token was minted
   * in the last few minutes, so this has to genuinely re-authenticate — it is
   * not a formality that can be skipped or faked client-side.
   */
  const reauthenticate = async () => {
    if (isPasswordAccount) {
      await signInWithPassword(email, password);
      return;
    }
    // Social sign-in is not wired into this app yet. Failing loudly is right:
    // silently continuing would send a request the server will reject anyway,
    // and the error it returns would not explain why.
    throw new Error(t('account.reauthUnavailable'));
  };

  const onExport = async () => {
    setExporting(true);
    try {
      const data = await api.account.export();
      const stamp = new Date().toISOString().slice(0, 10);
      const file = new File(Paths.cache, `seamflow-data-${stamp}.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(data, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: t('account.exportTitle'),
        });
      } else {
        await dialog.alert({
          title: t('account.exportSavedTitle'),
          message: t('account.exportSavedBody'),
          tone: 'success',
        });
      }
    } catch (err) {
      await dialog.error(err);
    } finally {
      setExporting(false);
    }
  };

  const onDelete = async () => {
    const sure = await dialog.confirm({
      title: t('account.confirmTitle'),
      message: t('account.confirmBody'),
      confirmLabel: t('account.confirmAction'),
      tone: 'error',
    });
    if (!sure) return;

    setWorking(true);
    try {
      await reauthenticate();
      const state = await api.account.requestDeletion();
      await refetch();
      await dialog.alert({
        title: t('account.scheduledTitle'),
        message: t('account.scheduledBody', { days: state.daysRemaining ?? 30 }),
        tone: 'success',
      });
      router.replace('/(app)');
    } catch (err) {
      await dialog.error(err);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title={t('account.deleteTitle')} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[styles.notice, { backgroundColor: colors.surfaceElevated, borderColor: colors.danger }]}
        >
          <Ionicons name="warning-outline" size={22} color={colors.danger} />
          <Text variant="bodySm" tone="text" style={styles.noticeText}>
            {t('account.warningBody', { days: 30 })}
          </Text>
        </View>

        <Text variant="h3" style={styles.heading}>{t('account.whatGoesTitle')}</Text>
        {[
          t('account.goesRequests'),
          t('account.goesMessages'),
          t('account.goesMeasurements'),
          t('account.goesAccount'),
        ].map((line) => (
          <View key={line} style={styles.bullet}>
            <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
            <Text variant="bodySm" tone="textMuted" style={styles.bulletText}>{line}</Text>
          </View>
        ))}

        <Text variant="h3" style={styles.heading}>{t('account.takeItTitle')}</Text>
        <Text variant="bodySm" tone="textMuted" style={styles.para}>
          {t('account.takeItBody', { days: 30 })}
        </Text>
        <Button
          label={t('account.exportAction')}
          variant="secondary"
          loading={exporting}
          onPress={onExport}
        />

        <Text variant="h3" style={styles.heading}>{t('account.confirmItTitle')}</Text>
        {isPasswordAccount ? (
          <Input
            label={t('account.passwordLabel')}
            placeholder={t('account.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        ) : (
          <Text variant="bodySm" tone="textMuted" style={styles.para}>
            {t('account.reauthUnavailable')}
          </Text>
        )}

        <Input
          label={t('account.typeEmailLabel')}
          placeholder={email}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={{ height: spacing.md }} />
        <Button
          label={t('account.deleteAction')}
          variant="danger"
          disabled={!canSubmit}
          loading={working}
          onPress={onDelete}
        />
        {!canSubmit ? (
          <Text variant="caption" tone="textMuted" style={styles.hint}>
            {t('account.needed')}
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeText: { flex: 1 },
  heading: { marginTop: spacing.lg, marginBottom: spacing.sm },
  para: { marginBottom: spacing.md },
  bullet: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginBottom: 6 },
  bulletText: { flex: 1 },
  hint: { marginTop: spacing.sm, textAlign: 'center' },
});
