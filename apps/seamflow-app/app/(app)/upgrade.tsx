// ============================================================================
// The plans screen (ROADMAP appendix I.11).
//
// Prices and payment methods come from the SERVER, which decides them from the
// tailor's country: Cameroon sees francs and mobile money first; everywhere
// else sees dollars and cards only, because those are the only rails we can
// actually honour there. Nothing on this screen hardcodes a market.
//
// Payment itself is not wired yet, and the screen says so plainly rather than
// offering a button that fails. What it does do today is answer the question a
// tailor in their last trial week actually has: what will this cost, what do I
// lose if I do nothing, and is my work safe. The answer to the last one is
// yes, and it is on the screen.
// ============================================================================

import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SubscriptionPaymentMethod } from '@seamflow/schemas';
import { Text, useAtelierTheme, withAlpha } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SkeletonForm } from '../../components/Skeleton';
import { useSubscription, usePlanRows } from '../../lib/subscription';
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
  const sub = useSubscription();
  const plans = usePlanRows(sub);

  if (!sub) {
    return (
      <Screen>
        <ScreenHeader title={t('billing.upgradeTitle')} />
        <SkeletonForm fields={3} />
      </Screen>
    );
  }

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
            return (
              <View
                key={p.key}
                style={[
                  styles.plan,
                  {
                    borderColor: best ? colors.primary : colors.hairline,
                    backgroundColor: best ? withAlpha(colors.primary, 0.06) : colors.surface,
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
              </View>
            );
          })}
        </View>

        {/* Payment methods — what this tailor will be able to use. */}
        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('billing.methodsTitle')}
        </Text>
        <View style={styles.methods}>
          {sub.billing.methods.map((m) => (
            <View
              key={m}
              style={[
                styles.method,
                { borderColor: colors.hairline, backgroundColor: colors.surface, borderRadius: radii.md },
              ]}
            >
              <Ionicons name={METHOD_ICON[m]} size={18} color={colors.textMuted} />
              <Text variant="bodySm">{t(METHOD_LABEL[m])}</Text>
            </View>
          ))}
        </View>
        <View
          style={[
            styles.notice,
            { borderColor: withAlpha(colors.primary, 0.35), backgroundColor: withAlpha(colors.primary, 0.08), borderRadius: radii.md },
          ]}
        >
          <Text variant="bodySm" style={{ color: colors.primary, fontWeight: '700' }}>
            {t('billing.methodsSoon')}
          </Text>
          <Text variant="bodySm" tone="textMuted" style={{ marginTop: 2 }}>
            {t('billing.methodsSoonBody')}
          </Text>
        </View>

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
            clients: sub.caps.clients,
            orders: sub.caps.activeOrders,
            photos: sub.caps.photos,
          })}
        </Text>

        {/* Where they stand today */}
        <Text variant="label" tone="textMuted" style={styles.section}>
          {t('billing.usageTitle')}
        </Text>
        <Usage label={t('billing.usageClients', { used: sub.usage.clients, limit: sub.caps.clients })} />
        <Usage label={t('billing.usageOrders', { used: sub.usage.activeOrders, limit: sub.caps.activeOrders })} />
        <Usage label={t('billing.usagePhotos', { used: sub.usage.photos, limit: sub.caps.photos })} />

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
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  lineText: { flex: 1, lineHeight: 20 },
});
