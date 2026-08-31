// ============================================================================
// Closing your account.
//
// Required by App Store guideline 5.1.1(v) and Google Play's data deletion
// policy, but the shape of it is ours, and it is built around one fact: for a
// tailor, this button is the end of their business records. Every client's
// measurements, every order, every invoice.
//
// So the screen is deliberately slow. Four things stand between a tap and a
// deletion, and each removes a different way of getting here by mistake:
//
//   the list      — you cannot agree to lose what you were never shown
//   the export    — the answer to "I didn't mean to" has to exist beforehand
//   re-auth       — a phone left unlocked on a table is not consent
//   type the name — a deliberate act that a pocket cannot perform
//
// And then it still does not happen for 30 days.
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
  const { session, signInWithPassword, signInWithGoogle } = useAuth();
  const { data: me, refetch } = useMe();

  const [password, setPassword] = useState('');
  const [typedName, setTypedName] = useState('');
  const [exporting, setExporting] = useState(false);
  const [working, setWorking] = useState(false);

  const email = session?.user?.email ?? me?.email ?? '';
  const businessName = me?.tailor?.businessName ?? '';
  // Google/Apple accounts have no password to re-enter, so they re-prove
  // themselves the same way they signed in.
  const provider = session?.user?.app_metadata?.provider ?? 'email';
  const isPasswordAccount = provider === 'email';

  // Case- and space-insensitive: we are asking for a deliberate act, not a
  // typing test, and rejecting "  My Shop" over a stray space just teaches
  // people to paste.
  const nameMatches =
    businessName.trim().toLowerCase() === typedName.trim().toLowerCase() && !!businessName;
  const canSubmit = nameMatches && (isPasswordAccount ? password.length > 0 : true);

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
      message: t('account.confirmBody', { name: businessName }),
      confirmLabel: t('account.confirmAction'),
      tone: 'error',
    });
    if (!sure) return;

    setWorking(true);
    try {
      // Re-authenticate FIRST. This mints a token the API will accept as proof
      // of identity; without it the request is refused server-side, so this is
      // not a client-side courtesy that can be skipped.
      if (isPasswordAccount) {
        await signInWithPassword(email, password);
      } else {
        await signInWithGoogle();
      }

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
        <View style={[styles.notice, { backgroundColor: colors.surfaceElevated, borderColor: colors.danger }]}>
          <Ionicons name="warning-outline" size={22} color={colors.danger} />
          <Text variant="bodySm" tone="text" style={styles.noticeText}>
            {t('account.warningBody', { days: 30 })}
          </Text>
        </View>

        {/* Shown before anything is asked of them. Agreeing to lose something
            you were never told about is not agreement. */}
        <Text variant="h3" style={styles.heading}>{t('account.whatGoesTitle')}</Text>
        {[
          t('account.goesClients'),
          t('account.goesOrders'),
          t('account.goesPhotos'),
          t('account.goesFeed'),
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
          iconStart={<Ionicons name="download-outline" size={18} color={colors.text} />}
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
            {t('account.reauthProviderBody')}
          </Text>
        )}

        <Input
          label={t('account.typeNameLabel', { name: businessName })}
          placeholder={businessName}
          value={typedName}
          onChangeText={setTypedName}
          autoCapitalize="none"
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
            {isPasswordAccount ? t('account.needed') : t('account.neededName')}
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
