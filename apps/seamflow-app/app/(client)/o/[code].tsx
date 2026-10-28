// ============================================================================
// An order link opened from outside the app.
//
//   https://www.seamflowtech.com/o/<code>
//
// A designer shares an order with a customer; the customer taps the link in
// WhatsApp or Messages. When the app is installed the phone hands the link here
// (see app.json intent filters, the website's apple-app-site-association file and
// app/+native-intent.tsx), and this screen does what the "Add an order" box would
// have done if they had pasted it: save the order to their account and open it.
//
// It never leaves anyone looking at a blank screen:
//   - signed out  → sign in first, then come straight back here;
//   - working     → a spinner that says what it is doing;
//   - failed      → the reason in plain words, with Try again and a way out;
//   - opened twice → saving is idempotent, so nothing is duplicated.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { Button } from '../../../components/Button';
import { useAuth } from '../../../lib/auth-context';
import { signInHref } from '../../../lib/auth-return';
import { useClaimOrder } from '../../../lib/consumer-queries';
import { toUserMessage } from '../../../lib/error-message';
import { useMode } from '../../../lib/mode';
import { useTranslation } from '../../../lib/i18n';
import { spacing } from '../../../lib/theme';

export default function OpenOrderLink() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session, loading } = useAuth();
  const { setMode } = useMode();
  const claim = useClaimOrder();
  const [failure, setFailure] = useState<{ title: string; message: string } | null>(null);
  // One attempt per arrival; "Try again" starts the next one deliberately.
  const started = useRef(false);

  const run = useCallback(async () => {
    if (!code) return;
    setFailure(null);
    try {
      const order = await claim.mutateAsync(code);
      // Opening an order someone shared with you is acting as a customer, even
      // for a designer who also shops: land on the customer side.
      setMode('client');
      router.replace(`/hub/orders/${order.id}` as never);
    } catch (err) {
      setFailure(toUserMessage(err, t));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (!session || started.current) return;
    started.current = true;
    void run();
  }, [session, run]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  // Not signed in: sign in, then return to this exact link.
  if (!session) {
    return <Redirect href={signInHref(`/o/${code ?? ''}`) as never} />;
  }

  if (failure) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text variant="h3" style={styles.text}>{t('claim.failedTitle')}</Text>
          <Text variant="bodySm" tone="textMuted" style={styles.text}>{failure.message}</Text>
          <View style={styles.actions}>
            <Button
              label={t('claim.tryAgain')}
              onPress={() => {
                started.current = true;
                void run();
              }}
            />
            <View style={{ height: spacing.sm }} />
            <Button
              label={t('claim.goToOrders')}
              variant="secondary"
              onPress={() => router.replace('/hub/orders' as never)}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text variant="bodySm" tone="textMuted" style={[styles.text, { marginTop: spacing.md }]}>
          {t('claim.opening')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  text: { textAlign: 'center', marginBottom: spacing.sm },
  actions: { width: '100%', marginTop: spacing.lg },
});
