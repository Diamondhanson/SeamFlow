// ============================================================================
// The plans screen (ROADMAP appendix I.11).
//
// Prices and payment methods come from the SERVER, which decides them from the
// tailor's country: Cameroon sees francs and mobile money first; everywhere
// else sees dollars and cards only, because those are the only rails we can
// actually honour there. Nothing on this screen hardcodes a market.
//
// The buying flow is complete; the rail underneath it is not chosen yet. Until
// one is connected the API answers "payments unavailable" and this screen says
// so in the same words it always has, rather than showing a server error. The
// day a provider is plugged in, nothing here changes.
//
// Success is never decided on the device: tapping Pay starts a payment and
// then the screen WAITS, polling, until the provider's confirmation reaches
// our server. That is also why the pending state is a first-class thing here —
// with mobile money, approving happens on the handset, outside this app.
// ============================================================================

import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SubscriptionPaymentMethod, SubscriptionPlan } from '@seamflow/schemas';
import { Text, useAtelierTheme, withAlpha } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SkeletonForm } from '../../components/Skeleton';
import { Button } from '../../components/Button';
import { useDialog } from '../../lib/dialog';
import {
  billingOf,
  capsOf,
  isPaymentsUnavailable,
  usageOf,
  useCheckout,
  usePaymentAttempt,
  usePlanRows,
  useSubscription,
} from '../../lib/subscription';
import { radii, spacing } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

const METHOD_ICON: Record<SubscriptionPaymentMethod, keyof typeof Ionicons.glyphMap> = {
  mtn_momo: 'phone-portrait-outline',
  orange_money: 'phone-portrait-outline',
  card: 'card-outline',
};
const METHOD_LABEL: Record<SubscriptionPaymentMethod, string> = {
  mtn_momo: 'billing.methodMtn',
  orange_money: 'billing.methodOrange',
  card: 'billing.methodCard',
};

const PREMIUM_LINES = [
  'billing.incUnlimited',
  'billing.incGroupOrders',
  'billing.incInvoices',
  'billing.incAiScan',
  'billing.incPhotos',
] as const;

export default function Upgrade() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const dialog = useDialog();
  const sub = useSubscription();
  const plans = usePlanRows(sub);
  const checkout = useCheckout();

  // Chosen plan; the method is picked at the moment of paying, which is how
  // people actually decide — the plan is the commitment, the method is a
  // detail they answer last.
  const [plan, setPlan] = useState<SubscriptionPlan>('annual');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const attempt = usePaymentAttempt(paymentId);

  const pay = (method: SubscriptionPaymentMethod) => {
    checkout.mutate(
      { plan, method },
      {
        onSuccess: (res) => {
          setPaymentId(res.paymentId);
          if (res.redirectUrl) void Linking.openURL(res.redirectUrl);
        },
        onError: (err) => {
          // No provider connected yet: say what the screen already says,
          // rather than showing a server error nobody can act on.
          if (isPaymentsUnavailable(err)) {
            void dialog.alert({
              title: t('billing.notYetTitle'),
              message: t('billing.notYetBody'),
              tone: 'info',
            });
            return;
          }
          void dialog.error(err);
        },
      },
    );
  };

  if (!sub) {
    return (
      <Screen>
        <ScreenHeader title={t('billing.upgradeTitle')} />
        <SkeletonForm fields={3} />
      </Screen>
    );
  }

  // Read through the tolerant helpers: a device can hold a subscription saved
  // before any of these fields existed, and a plans screen that crashes on an
  // old cache is worse than one that shows a conservative default for a moment.
  const billing = billingOf(sub);
  const caps = capsOf(sub);
  const usage = usageOf(sub);

  const statusLine =
    sub.status === 'trialing'
      ? t('billing.daysLeft', { days: sub.daysLeft })
      : sub.status === 'active'
        ? t('billing.renewsOn', { date: new Date(sub.premiumUntil ?? '').toLocaleDateString() })
        : sub.status === 'grace'
          ? t('billing.graceTitle')
          : t('billing.freeTitle');

  return (
    <Screen>
      <ScreenHeader title={t('billing.upgradeTitle')} subtitle={statusLine} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Text variant="bodySm" tone="textMuted">
          {t('billing.upgradeIntro')}
        </Text>

        {/* Plans */}
        <View style={styles.plans}>
          {plans.map((p) => {
            const best = p.key === 'annual';
            const selected = p.key === plan;
            return (
              <Pressable
                key={p.key}
                onPress={() => setPlan(p.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[
                  styles.plan,
                  {
                    borderColor: selected ? colors.primary : colors.hairline,
                    borderWidth: selected ? 2 : 1,
                    backgroundColor: selected || best ? withAlpha(colors.primary, 0.06) : colors.surface,
                    borderRadius: radii.lg,
                  },
                ]}
              >
                <View style={styles.planTop}>
                  <Text variant="h3">
                    {t(`billing.plan${p.key[0]!.toUpperCase()}${p.key.slice(1)}`)}
                  </Text>
                  {best ? (
                    <View style={[styles.tag, { backgroundColor: colors.primary, borderRadius: radii.sm }]}>
                      <Text variant="caption" style={{ color: colors.textOnPrimary, fontWeight: '700' }}>
                        {t('billing.bestValue')}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text variant="h2" style={{ marginTop: 2 }}>
                  {p.price}
                </Text>
                <View style={styles.planMeta}>
                  <Text variant="bodySm" tone="textMuted">
                    {t('billing.perMonth', { price: p.perMonth })}
                  </Text>
                  {p.savingsPercent > 0 ? (
                    <Text variant="bodySm" style={{ color: colors.success, fontWeight: '700' }}>
                      {t('billing.save', { percent: p.savingsPercent })}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Paying. One button per method this tailor may actually use. */}
        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('billing.choosePlan')}
        </Text>
        {attempt.data?.status === 'pending' ? (
          <View style={[styles.state, { borderColor: colors.hairline, backgroundColor: colors.surface, borderRadius: radii.md }]}>
            <ActivityIndicator color={colors.primary} />
            <View style={styles.stateText}>
              <Text variant="bodySm" style={{ fontWeight: '700' }}>{t('billing.pending')}</Text>
              <Text variant="bodySm" tone="textMuted">{t('billing.pendingBody')}</Text>
            </View>
          </View>
        ) : attempt.data?.status === 'succeeded' ? (
          <View style={[styles.state, { borderColor: colors.success, backgroundColor: withAlpha(colors.success, 0.1), borderRadius: radii.md }]}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <View style={styles.stateText}>
              <Text variant="bodySm" style={{ fontWeight: '700' }}>{t('billing.paid')}</Text>
              <Text variant="bodySm" tone="textMuted">
                {t('billing.paidBody', { date: new Date(sub.premiumUntil ?? '').toLocaleDateString() })}
              </Text>
            </View>
          </View>
        ) : (
          <>
            {attempt.data?.status === 'failed' ? (
              <View style={[styles.state, { borderColor: colors.danger, backgroundColor: withAlpha(colors.danger, 0.08), borderRadius: radii.md }]}>
                <Ionicons name="alert-circle" size={22} color={colors.danger} />
                <View style={styles.stateText}>
                  <Text variant="bodySm" style={{ fontWeight: '700' }}>{t('billing.failed')}</Text>
                  <Text variant="bodySm" tone="textMuted">{t('billing.failedBody')}</Text>
                </View>
              </View>
            ) : null}
            <View style={styles.payButtons}>
              {billing.methods.map((m) => (
                <Button
                  key={m}
                  label={t('billing.payWith', { method: t(METHOD_LABEL[m]) })}
                  variant={m === billing.methods[0] ? 'primary' : 'secondary'}
                  loading={checkout.isPending}
                  iconStart={
                    <Ionicons
                      name={METHOD_ICON[m]}
                      size={18}
                      color={m === billing.methods[0] ? colors.textOnPrimary : colors.text}
                    />
                  }
                  onPress={() => pay(m)}
                />
              ))}
            </View>
          </>
        )}

        {/* What premium unlocks */}
        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('billing.includedTitle')}
        </Text>
        {PREMIUM_LINES.map((key) => (
          <View key={key} style={styles.line}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text variant="bodySm" style={styles.lineText}>
              {t(key)}
            </Text>
          </View>
        ))}
        <View style={styles.line}>
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
          <Text variant="bodySm" style={styles.lineText}>
            {t('billing.incReminders')}
          </Text>
        </View>

        {/* What Free keeps — the promise, stated where it is most doubted. */}
        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('billing.freeIncludesTitle')}
        </Text>
        <Text variant="bodySm" tone="textMuted" style={{ lineHeight: 20 }}>
          {t('billing.freeIncludes', {
            clients: caps.clients,
            orders: caps.activeOrders,
            photos: caps.photos,
          })}
        </Text>

        {/* Where they stand today */}
        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('billing.usageTitle')}
        </Text>
        <Usage label={t('billing.usageClients', { used: usage.clients, limit: caps.clients })} />
        <Usage label={t('billing.usageOrders', { used: usage.activeOrders, limit: caps.activeOrders })} />
        <Usage label={t('billing.usagePhotos', { used: usage.photos, limit: caps.photos })} />

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

function Usage({ label }: { label: string }) {
  const { colors } = useAtelierTheme();
  return (
    <View style={styles.line}>
      <Ionicons name="ellipse-outline" size={14} color={colors.textMuted} />
      <Text variant="bodySm" tone="textMuted" style={styles.lineText}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.xl },
  plans: { gap: spacing.sm, marginTop: spacing.lg },
  plan: { borderWidth: 1, padding: spacing.lg },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  planMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: 2 },
  section: { marginTop: spacing.xl, marginBottom: spacing.sm },
  methods: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  notice: { borderWidth: 1, padding: spacing.md, marginTop: spacing.md },
  state: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, padding: spacing.md, marginBottom: spacing.md },
  stateText: { flex: 1, gap: 2 },
  payButtons: { gap: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  lineText: { flex: 1, lineHeight: 20 },
});
