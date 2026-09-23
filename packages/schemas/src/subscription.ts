import { z } from 'zod';

// ============================================================================
// Subscriptions — the money model (ROADMAP appendix I), server side first.
//
// THE SHAPE
// Every tailor gets 6 weeks with everything unlocked. When that ends they are
// NOT locked out: they land on a permanent Free tier that still works, with
// premium features and a few caps switched on. Subscribing unlocks everything
// again. Whatever method pays — mobile money today, card later — there is one
// `premiumUntil` date per tailor, and one check that reads it.
//
// THE RULE THAT CANNOT BREAK (appendix I.1)
// A tailor can always open SeamFlow and read their own clients, measurements
// and order history, in every state, forever. Gating closes premium FEATURES
// and caps NEW records. It never hides what someone already created.
//
// EVERY NUMBER HERE IS CONFIG
// Caps and prices live in this one file, shared by the API and the app, so a
// market can be re-tuned without hunting through screens. Prices are
// placeholders in XAF until the real ones are set.
// ============================================================================

/** How long a new tailor gets everything, free. Six weeks ≈ one order cycle. */
export const TRIAL_DAYS = 42;

/** Card dunning window: a failed charge keeps access for this long (I.6). */
export const GRACE_DAYS = 7;

export const SubscriptionStatusSchema = z.enum([
  /** Inside the free trial. Everything unlocked. */
  'trialing',
  /** Paid and current. */
  'active',
  /** Card only: a charge failed and the recovery window is running. Unlocked. */
  'grace',
  /** No entitlement. Premium features gated, caps enforced, data untouched. */
  'free',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionPlanSchema = z.enum(['monthly', 'quarterly', 'annual']);
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

export const PaymentMethodSchema = z.enum(['mtn_momo', 'orange_money', 'card']);
export type SubscriptionPaymentMethod = z.infer<typeof PaymentMethodSchema>;

export interface PlanDef {
  key: SubscriptionPlan;
  /** Days added to `premiumUntil` on payment. */
  days: number;
  /** PLACEHOLDER pricing, in the minor-unit-free XAF the market quotes in. */
  priceXaf: number;
}

/**
 * Longer prepay is discounted on purpose: mobile money cannot auto-renew, so
 * every manual renewal is a chance to churn. A tailor who paid for a year has
 * eleven fewer chances to forget.
 */
export const PLANS: PlanDef[] = [
  { key: 'monthly', days: 30, priceXaf: 3000 },
  { key: 'quarterly', days: 90, priceXaf: 7500 },
  { key: 'annual', days: 365, priceXaf: 25500 },
];

export const planFor = (key: SubscriptionPlan): PlanDef =>
  PLANS.find((p) => p.key === key) ?? PLANS[0]!;

/** Savings vs paying monthly, as a whole percentage. 0 for the monthly plan. */
export function planSavingsPercent(key: SubscriptionPlan): number {
  const plan = planFor(key);
  const monthly = planFor('monthly');
  const atMonthlyRate = (plan.days / monthly.days) * monthly.priceXaf;
  if (atMonthlyRate <= plan.priceXaf) return 0;
  return Math.round((1 - plan.priceXaf / atMonthlyRate) * 100);
}

// ── What Free costs you ─────────────────────────────────────────────────────

/**
 * Caps on NEW records only. Nothing here can hide or delete what exists, and
 * a tailor over a cap (e.g. after a trial with 60 clients) keeps every one of
 * them — they just cannot add the 61st until they subscribe.
 */
export interface FreeCaps {
  clients: number;
  /** Orders not yet delivered. Finishing one frees a slot. */
  activeOrders: number;
  photos: number;
}

export const FREE_CAPS: FreeCaps = {
  clients: 25,
  activeOrders: 6,
  photos: 35,
};

/**
 * Premium-only features. Deadline reminders are deliberately NOT here: the
 * app quietly saving a tailor from a missed delivery is the habit the whole
 * product is built on, and charging for it would teach people to ignore it.
 */
export const PREMIUM_FEATURES = [
  'group_orders',
  'invoices',
  'ai_measurement_scan',
  'unlimited_photos',
  'discovery_boost',
] as const;
export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];

/** What a capped action was. Sent to the app so it can name the right limit. */
export const CapKindSchema = z.enum(['clients', 'active_orders', 'photos']);
export type CapKind = z.infer<typeof CapKindSchema>;

// ── What the app reads ──────────────────────────────────────────────────────

export const SubscriptionStateSchema = z.object({
  status: SubscriptionStatusSchema,
  /** True when premium features are available right now. The app mirrors this
   *  for affordances only — the server decides (appendix I.9). */
  premium: z.boolean(),
  trialEndsAt: z.string().datetime().nullable(),
  premiumUntil: z.string().datetime().nullable(),
  /** Whole days left of trial or paid time; 0 once it has run out. */
  daysLeft: z.number().int(),
  plan: SubscriptionPlanSchema.nullable(),
  method: PaymentMethodSchema.nullable(),
  /**
   * False while the caps and gates are switched off platform-wide — which is
   * how this ships, so nobody is blocked before there is any way to pay.
   */
  enforced: z.boolean(),
  /** Current usage against the Free caps, for the upgrade screen. */
  usage: z.object({
    clients: z.number().int(),
    activeOrders: z.number().int(),
    photos: z.number().int(),
  }),
  caps: z.object({
    clients: z.number().int(),
    activeOrders: z.number().int(),
    photos: z.number().int(),
  }),
});
export type SubscriptionState = z.infer<typeof SubscriptionStateSchema>;

/**
 * The body of a 402 from any gated endpoint. Carries enough for the app to
 * open the right upgrade sheet rather than show a raw error.
 */
export const UpgradeRequiredSchema = z.object({
  error: z.literal('upgrade_required'),
  feature: z.enum(PREMIUM_FEATURES).nullable(),
  cap: CapKindSchema.nullable(),
  limit: z.number().int().nullable(),
});
export type UpgradeRequired = z.infer<typeof UpgradeRequiredSchema>;

// ── Admin (ops dashboard) ───────────────────────────────────────────────────

export const GrantDaysSchema = z.object({
  /** Negative is allowed: a mistake must be reversible. */
  days: z.number().int().min(-3650).max(3650),
  reason: z.string().max(200).optional(),
});
export type GrantDaysInput = z.infer<typeof GrantDaysSchema>;
