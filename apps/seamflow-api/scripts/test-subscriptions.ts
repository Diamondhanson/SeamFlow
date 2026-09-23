/**
 * End-to-end test for entitlements and the trial (ROADMAP appendix I, part 1).
 *
 * What has to hold before any money is involved:
 *   · a new tailor starts on a 6-week trial with everything unlocked
 *   · when the trial runs out they land on Free — and every client, order and
 *     measurement they made is still there (appendix I.1, the one rule)
 *   · nothing is BLOCKED while enforcement is off, which is how this ships
 *   · paying extends one date; renewing early ADDS days rather than losing them
 *   · a provider confirmation delivered twice pays once
 *   · usage is counted honestly against the Free caps
 *   · only staff can move anyone's dates, and the admin levers work
 *   · the paywall switch flips from the dashboard, takes effect without a
 *     restart, and goes back off again
 *   · buying: with no provider connected, checkout says so; with the fake
 *     provider, a signed webhook, and only a signed one, extends the date
 *   · the reminder job finds a trial about to end and would email the tailor,
 *     which on a store build is the only way they learn where to subscribe
 *   · with enforcement ON: premium features and the caps refuse politely (402
 *     "upgrade_required"), reads still work, and paying unblocks everything
 *
 * Throwaway accounts; the calendar is driven by the dev-only hooks rather than
 * by waiting six weeks. Run with: pnpm test:subscriptions
 */
import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { FREE_CAPS, TRIAL_DAYS, planFor } from '@seamflow/schemas';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = process.env.PORT ?? '3001';
const PASSWORD = 'change-me-only-used-in-tests-9f3a2c';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
async function api(jwt: string | null, method: string, path: string, body?: unknown) {
  const res = await fetch(`http://localhost:${PORT}${path}`, {
    method,
    headers: { ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}), 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null } as { status: number; data: any };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  assert(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY, 'Supabase env not set');
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const created: string[] = [];
  // Platform-wide side effects must be undone even when an assertion fails
  // halfway: an aborted run once left every real tailor with 14 extra days.
  let trialDaysAdded = 0;
  // Set once a staff token exists; the only way to move trials back.
  let undoTrials: ((days: number) => Promise<void>) | null = null;

  try {
    const email = `subs-test-${Date.now()}@seamflow.local`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    assert(!error, `createUser: ${error?.message}`);
    created.push(data.user!.id);
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const s = await anon.auth.signInWithPassword({ email, password: PASSWORD });
    const jwt = s.data.session!.access_token;
    await api(jwt, 'GET', '/me');
    await api(jwt, 'POST', '/me/tailor', { businessName: 'Trial Test Studio', countryCode: 'CM', currency: 'XAF' });
    const tailorId = (await api(jwt, 'GET', '/me')).data.tailor.id;

    // ---- A new tailor is on trial ------------------------------------------
    let r = await api(jwt, 'GET', '/me/subscription');
    assert(r.status === 200, `GET /me/subscription: ${r.status}`);
    let sub = r.data;
    assert(sub.status === 'trialing' && sub.premium === true, `expected a trial, got ${sub.status}`);
    assert(
      sub.daysLeft === TRIAL_DAYS || sub.daysLeft === TRIAL_DAYS - 1,
      `expected ~${TRIAL_DAYS} days of trial, got ${sub.daysLeft}`,
    );
    // Both modes are valid: the gates ship OFF, and this same test is run
    // again with SUBSCRIPTION_ENFORCEMENT=true to prove they work when on.
    const enforcing: boolean = sub.enforced;
    assert(sub.caps.clients === FREE_CAPS.clients, 'caps do not match the shared config');
    console.log(`• A new tailor starts on a ${sub.daysLeft}-day trial, everything unlocked`);

    // /me carries it too, so the countdown is right on first paint.
    r = await api(jwt, 'GET', '/me');
    assert(r.data.subscription?.status === 'trialing', '/me did not carry the subscription');
    console.log('• /me carries the same state, so no extra call on app open');

    // ---- Usage is counted --------------------------------------------------
    r = await api(jwt, 'POST', '/clients', { fullName: 'Cap Test Client', phone: '+237600000001', address: 'Douala' });
    assert(r.status === 201, `POST /clients: ${r.status}`);
    const clientId = r.data.id;
    r = await api(jwt, 'POST', '/orders', {
      clientId,
      orderName: 'Trial order',
      items: [{ garmentType: 'kaftan', measurements: {}, quantity: 1 }],
    });
    assert(r.status === 201, `POST /orders: ${r.status}`);
    sub = (await api(jwt, 'GET', '/me/subscription')).data;
    assert(sub.usage.clients === 1 && sub.usage.activeOrders === 1, `usage wrong: ${JSON.stringify(sub.usage)}`);
    console.log('• Usage against the Free caps is counted from real records');

    // ---- The trial runs out ------------------------------------------------
    await admin.from('subscriptions').update({ trial_ends_at: new Date(Date.now() - 86_400_000).toISOString() }).eq('tailor_id', tailorId);
    sub = (await api(jwt, 'GET', '/me/subscription')).data;
    assert(sub.status === 'free' && sub.premium === false, `after the trial expected free, got ${sub.status}`);
    assert(sub.daysLeft === 0, `expected 0 days left, got ${sub.daysLeft}`);
    console.log('• When the trial ends the tailor lands on Free');

    // THE RULE: their own data is still all there.
    r = await api(jwt, 'GET', '/clients');
    assert(r.status === 200 && r.data.items.length === 1, 'a Free tailor lost sight of their clients');
    r = await api(jwt, 'GET', '/orders');
    assert(r.status === 200 && r.data.items.length === 1, 'a Free tailor lost sight of their orders');
    console.log('• On Free, every client and order they made is still readable');

    // ...and with the switch off nothing is blocked, because nobody can pay yet.
    r = await api(jwt, 'POST', '/clients', { fullName: 'Second Client', phone: '+237600000002', address: 'Douala' });
    if (enforcing) {
      assert(r.status === 201, `under the cap, creating should work: ${r.status}`);
    } else {
      assert(r.status === 201, `with enforcement off, creating should still work: ${r.status}`);
      console.log('• With enforcement off, a Free tailor is not blocked from anything');
    }

    // ---- Paying moves one date --------------------------------------------
    r = await api(null, 'POST', '/health/subscription-pay', { tailorId, plan: 'monthly', providerRef: 'ref-1' });
    assert(r.data.applied === true, 'the first payment did not apply');
    sub = (await api(jwt, 'GET', '/me/subscription')).data;
    const monthly = planFor('monthly').days;
    assert(sub.status === 'active' && sub.premium === true, `after paying expected active, got ${sub.status}`);
    assert(sub.daysLeft === monthly || sub.daysLeft === monthly - 1, `expected ~${monthly} days, got ${sub.daysLeft}`);
    console.log(`• A payment unlocks premium for ${sub.daysLeft} days`);

    // Same confirmation twice pays once.
    r = await api(null, 'POST', '/health/subscription-pay', { tailorId, plan: 'monthly', providerRef: 'ref-1' });
    assert(r.data.applied === false, 'a repeated provider confirmation paid twice');
    sub = (await api(jwt, 'GET', '/me/subscription')).data;
    assert(sub.daysLeft <= monthly, `a duplicate webhook added days: ${sub.daysLeft}`);
    console.log('• The same provider confirmation delivered twice pays once');

    // Renewing early stacks rather than restarting.
    r = await api(null, 'POST', '/health/subscription-pay', { tailorId, plan: 'quarterly', providerRef: 'ref-2' });
    assert(r.data.applied === true, 'the renewal did not apply');
    sub = (await api(jwt, 'GET', '/me/subscription')).data;
    const stacked = monthly + planFor('quarterly').days;
    assert(sub.daysLeft >= stacked - 1, `renewing early lost days: ${sub.daysLeft}, expected ~${stacked}`);
    console.log(`• Renewing early adds days to the end (${sub.daysLeft} days), losing nothing`);

    // ---- Your safety net ---------------------------------------------------
    await admin.from('subscriptions').update({ premium_until: null, trial_ends_at: new Date(Date.now() - 86_400_000).toISOString() }).eq('tailor_id', tailorId);
    r = await api(null, 'POST', '/health/subscription-grant', { tailorId, days: 30, trial: true });
    assert(r.status === 201 || r.status === 200, `trial extension: ${r.status}`);
    sub = (await api(jwt, 'GET', '/me/subscription')).data;
    assert(sub.status === 'trialing' && sub.daysLeft >= 29, `extending the trial failed: ${JSON.stringify(sub)}`);
    console.log('• A trial can be extended — the fallback if payments are delayed');

    // ---- Housekeeping ------------------------------------------------------
    await admin.from('subscriptions').update({ trial_ends_at: new Date(Date.now() - 86_400_000).toISOString(), status: 'trialing' }).eq('tailor_id', tailorId);
    r = await api(null, 'POST', '/health/subscription-sync');
    assert(r.data.lapsed >= 1, 'the nightly job did not move a lapsed trial to free');
    const [row] = (await admin.from('subscriptions').select('status').eq('tailor_id', tailorId)).data!;
    assert(row.status === 'free', `stored status not synced: ${row.status}`);
    console.log('• The nightly job marks lapsed trials as Free');

    // ---- The gates, when the switch is on ----------------------------------
    // Skipped unless the server was booted with SUBSCRIPTION_ENFORCEMENT=true,
    // because that is exactly how it ships: built, tested, and switched off.
    sub = (await api(jwt, 'GET', '/me/subscription')).data;
    if (!sub.enforced) {
      console.log('• (gates not exercised: SUBSCRIPTION_ENFORCEMENT is off, which is how this ships)');
    } else {
      assert(sub.premium === false, 'the tailor should be on Free for the gate checks');

      r = await api(jwt, 'POST', '/group-orders', { name: 'Wedding party', eventDate: null });
      assert(r.status === 402, `group orders should need premium, got ${r.status}`);
      assert(r.data.feature === 'group_orders', `wrong upgrade payload: ${JSON.stringify(r.data)}`);
      const orderId = (await api(jwt, 'GET', '/orders')).data.items[0].id;
      r = await api(jwt, 'POST', `/orders/${orderId}/invoice`, {});
      assert(r.status === 402 && r.data.feature === 'invoices', `invoices should need premium, got ${r.status}`);
      r = await api(jwt, 'POST', '/ai/extract-measurements', { storagePath: 'x/y.jpg', mode: 'measurements' });
      assert(r.status === 402 && r.data.feature === 'ai_measurement_scan', `AI scan should need premium, got ${r.status}`);
      console.log('• On Free, premium features answer 402 "upgrade_required", naming the feature');

      // Reads are never gated — the rule that cannot break.
      assert((await api(jwt, 'GET', '/orders')).status === 200, 'a blocked tailor lost their orders');
      assert((await api(jwt, 'GET', '/clients')).status === 200, 'a blocked tailor lost their clients');
      assert((await api(jwt, 'GET', '/invoices')).status === 200, 'a blocked tailor lost their invoices');
      console.log('• Even while blocked, every existing record stays readable');

      // The active-order cap: fill it, then the next one is refused.
      const capClient = (await api(jwt, 'GET', '/clients')).data.items[0].id;
      let made = (await api(jwt, 'GET', '/me/subscription')).data.usage.activeOrders;
      let capped: { status: number; data: any } | null = null;
      for (let i = made; i <= FREE_CAPS.activeOrders + 1; i++) {
        const res = await api(jwt, 'POST', '/orders', {
          clientId: capClient,
          orderName: `Cap order ${i}`,
          items: [{ garmentType: 'kaftan', measurements: {}, quantity: 1 }],
        });
        if (res.status === 402) { capped = res; break; }
        assert(res.status === 201, `order ${i}: ${res.status}`);
        made++;
      }
      assert(capped, `the active-order cap never fired (made ${made})`);
      assert(capped.data.cap === 'active_orders' && capped.data.limit === FREE_CAPS.activeOrders,
        `wrong cap payload: ${JSON.stringify(capped.data)}`);
      assert(made === FREE_CAPS.activeOrders, `cap fired at ${made}, expected ${FREE_CAPS.activeOrders}`);
      console.log(`• The Free cap of ${FREE_CAPS.activeOrders} active orders is enforced, and says which limit was hit`);

      // Paying lifts everything at once.
      await api(null, 'POST', '/health/subscription-pay', { tailorId, plan: 'monthly', providerRef: 'ref-gate' });
      r = await api(jwt, 'POST', '/group-orders', { name: 'Wedding party', eventDate: null });
      assert(r.status === 201 || r.status === 200, `premium should unblock group orders, got ${r.status}`);
      r = await api(jwt, 'POST', '/orders', {
        clientId: capClient,
        orderName: 'Order after paying',
        items: [{ garmentType: 'kaftan', measurements: {}, quantity: 1 }],
      });
      assert(r.status === 201, `premium should lift the order cap, got ${r.status}`);
      console.log('• Paying lifts the caps and unlocks the premium features immediately');
    }
    // ---- The admin levers (staff only) -------------------------------------
    const staffEmail = `subs-staff-${Date.now()}@seamflow.local`;
    const staffUser = await admin.auth.admin.createUser({ email: staffEmail, password: PASSWORD, email_confirm: true });
    created.push(staffUser.data.user!.id);
    const staffAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const staffSignIn = await staffAnon.auth.signInWithPassword({ email: staffEmail, password: PASSWORD });
    const staffJwt = staffSignIn.data.session!.access_token;
    await api(staffJwt, 'GET', '/me');
    undoTrials = async (days: number) => {
      await api(staffJwt, 'POST', '/admin/subscriptions/trials/extend-all', { days: -days });
    };

    // Not staff yet: the levers must refuse.
    r = await api(staffJwt, 'POST', `/admin/subscriptions/${tailorId}/grant`, { days: 30 });
    assert(r.status === 403, `a non-staff account moved a date: ${r.status}`);
    r = await api(jwt, 'POST', `/admin/subscriptions/${tailorId}/grant`, { days: 3650 });
    assert(r.status === 403, `a tailor granted themselves premium: ${r.status}`);
    console.log('• Only staff can move dates — a tailor cannot grant themselves premium');

    await admin.from('staff').insert({ user_id: staffUser.data.user!.id });
    r = await api(staffJwt, 'POST', `/admin/subscriptions/${tailorId}/grant`, { days: 30, reason: 'test' });
    assert(r.status === 201 || r.status === 200, `grant: ${r.status} ${JSON.stringify(r.data)}`);
    sub = (await api(jwt, 'GET', '/me/subscription')).data;
    assert(sub.premium === true && sub.daysLeft >= 29, `granting days did not unlock: ${JSON.stringify(sub)}`);
    console.log('• Staff can grant premium days to one tailor');

    // A mistake is undone by granting negative days, not by editing history.
    const beforeUndo = (await api(jwt, 'GET', '/me/subscription')).data.daysLeft;
    r = await api(staffJwt, 'POST', `/admin/subscriptions/${tailorId}/grant`, { days: -30, reason: 'undo' });
    assert(r.status === 201 || r.status === 200, `negative grant: ${r.status}`);
    sub = (await api(jwt, 'GET', '/me/subscription')).data;
    assert(
      sub.daysLeft <= beforeUndo - 29,
      `granting -30 days took back ${beforeUndo - sub.daysLeft}, expected ~30`,
    );
    console.log('• A mistaken grant is undone by granting negative days');

    // Extend every trial at once — the launch safety net.
    const before = (await admin.from('subscriptions').select('trial_ends_at').eq('tailor_id', tailorId)).data![0]!.trial_ends_at;
    r = await api(staffJwt, 'POST', '/admin/subscriptions/trials/extend-all', { days: 14 });
    assert(r.status === 201 || r.status === 200, `extend-all: ${r.status}`);
    trialDaysAdded += 14;
    assert(r.data.updated >= 1, `extend-all touched nothing: ${JSON.stringify(r.data)}`);
    const after = (await admin.from('subscriptions').select('trial_ends_at').eq('tailor_id', tailorId)).data![0]!.trial_ends_at;
    assert(new Date(after) > new Date(before), 'extend-all did not move this trial');
    console.log(`• One click moved all ${r.data.updated} trials by 14 days`);

    // ---- The paywall switch ------------------------------------------------
    // Everything above ran with the caps off. Flipping the switch must start
    // them refusing within seconds — no deploy, no restart — and flipping it
    // back must stop, because that is the emergency handle if payments break.
    r = await api(staffJwt, 'GET', '/admin/subscriptions/enforcement');
    assert(r.status === 200, `read enforcement: ${r.status}`);
    const wasEnforced: boolean = r.data.enforced;

    if (!wasEnforced) {
      // Make sure this tailor is on Free so a cap can actually bite.
      await admin.from('subscriptions').update({
        premium_until: null,
        grace_until: null,
        trial_ends_at: new Date(Date.now() - 86_400_000).toISOString(),
      }).eq('tailor_id', tailorId);

      r = await api(staffJwt, 'POST', '/admin/subscriptions/enforcement', { enforced: true });
      assert(r.data.enforced === true, 'the switch did not turn on');
      // The API caches the setting for a few seconds; wait it out rather than
      // pretending the cache does not exist.
      await sleep(16_000);
      r = await api(jwt, 'POST', '/group-orders', { name: 'Switch test', eventDate: null });
      assert(r.status === 402, `with the switch on, group orders should be blocked, got ${r.status}`);
      sub = (await api(jwt, 'GET', '/me/subscription')).data;
      assert(sub.enforced === true, 'the app is not told the caps are live');
      console.log('• Turning the switch ON starts blocking within seconds, and the app is told');

      r = await api(staffJwt, 'POST', '/admin/subscriptions/enforcement', { enforced: false });
      assert(r.data.enforced === false, 'the switch did not turn off');
      await sleep(16_000);
      r = await api(jwt, 'POST', '/group-orders', { name: 'Switch test', eventDate: null });
      assert(r.status === 201 || r.status === 200, `turning it off should unblock, got ${r.status}`);
      console.log('• Turning it OFF unblocks everyone again — the emergency handle works');
    } else {
      console.log('• (switch not exercised: SUBSCRIPTION_ENFORCEMENT forces it on in this env)');
    }

    console.log('• ...and the run puts every trial back where it found it');

    // ---- Reminders ---------------------------------------------------------
    // Three days out is one of the reminder marks. The email itself needs a
    // Resend key, so locally it logs instead of sending; what must hold is
    // that the job FINDS this tailor and addresses them.
    await admin.from('subscriptions').update({
      premium_until: null,
      grace_until: null,
      trial_ends_at: new Date(Date.now() + 3 * 86_400_000 - 60_000).toISOString(),
    }).eq('tailor_id', tailorId);
    r = await api(null, 'POST', '/health/subscription-reminders');
    assert(r.status === 201 || r.status === 200, `reminders: ${r.status}`);
    assert(r.data.sent >= 1, `the reminder job missed a trial ending in 3 days (sent ${r.data.sent})`);
    console.log(`• The reminder job picks up a trial ending in 3 days (${r.data.sent} reminder(s))`);

    // A tailor who turned emails off is still pushed, never emailed.
    await admin.from('users').update({ subscription_emails_opt_in: false }).eq('id', created[0]!);
    r = await api(null, 'POST', '/health/subscription-reminders');
    assert(r.data.emailed === 0, 'a tailor who opted out was emailed anyway');
    await admin.from('users').update({ subscription_emails_opt_in: true }).eq('id', created[0]!);
    console.log('• Opting out of emails is honoured');

    // ---- Buying a subscription ---------------------------------------------
    r = await api(jwt, 'POST', '/subscriptions/checkout', { plan: 'monthly', method: 'mtn_momo' });
    if (r.status === 503) {
      assert(r.data.error === 'payments_unavailable', `unexpected 503 body: ${JSON.stringify(r.data)}`);
      console.log('• With no provider connected, checkout says "not available yet" — the app shows "coming soon"');
    } else {
      // SUBSCRIPTION_PAYMENT_PROVIDER=fake: drive the whole path.
      assert(r.status === 201 || r.status === 200, `checkout: ${r.status} ${JSON.stringify(r.data)}`);
      const { paymentId, status, instruction } = r.data;
      assert(status === 'pending' && instruction === 'approve_on_phone', `bad checkout result: ${JSON.stringify(r.data)}`);
      console.log('• Checkout starts a payment and waits — approval happens on the handset');

      r = await api(jwt, 'GET', `/subscriptions/payments/${paymentId}`);
      assert(r.data.status === 'pending', 'a just-started payment should be pending');

      const before = (await api(jwt, 'GET', '/me/subscription')).data.daysLeft;

      // An unsigned webhook is the whole attack: anyone can POST this URL.
      const payload = JSON.stringify({ ref: `fake_${paymentId}`, paymentId, status: 'succeeded', amount: 3000, currency: 'XAF' });
      let res = await fetch(`http://localhost:${PORT}/subscriptions/webhook/fake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-fake-signature': 'not-a-signature' },
        body: payload,
      });
      assert((await res.json()).handled === false, 'an unsigned webhook was accepted');
      r = await api(jwt, 'GET', `/subscriptions/payments/${paymentId}`);
      assert(r.data.status === 'pending', 'an unsigned webhook changed a payment');
      console.log('• An unsigned webhook is refused — the signature is the only authority');

      const sign = (body: string) =>
        createHmac('sha256', 'fake-provider-secret-for-tests-only').update(body).digest('hex');
      res = await fetch(`http://localhost:${PORT}/subscriptions/webhook/fake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-fake-signature': sign(payload) },
        body: payload,
      });
      assert((await res.json()).handled === true, 'a signed webhook was not handled');
      r = await api(jwt, 'GET', `/subscriptions/payments/${paymentId}`);
      assert(r.data.status === 'succeeded', `payment not settled: ${r.data.status}`);
      sub = (await api(jwt, 'GET', '/me/subscription')).data;
      assert(sub.premium === true && sub.daysLeft >= before + 29, `paying did not add 30 days: ${before} → ${sub.daysLeft}`);
      console.log('• A signed webhook settles the payment and extends the date by the plan');

      // Providers re-deliver. Twice paid is once credited.
      const after = sub.daysLeft;
      res = await fetch(`http://localhost:${PORT}/subscriptions/webhook/fake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-fake-signature': sign(payload) },
        body: payload,
      });
      void (await res.json());
      sub = (await api(jwt, 'GET', '/me/subscription')).data;
      assert(sub.daysLeft === after, `a re-delivered webhook added days: ${after} → ${sub.daysLeft}`);
      console.log('• A webhook delivered twice credits once');

      r = await api(jwt, 'GET', '/subscriptions/payments');
      assert(r.data.items.length >= 1 && r.data.items[0].status === 'succeeded', 'payment history is wrong');
      console.log('• The payment appears in the tailor’s history');
    }
  } finally {
    // Both of these are platform-wide. Leaving the switch on would block every
    // real tailor; leaving the trial extension on would quietly hand them all
    // free time. Undone here so that no failure, anywhere above, can leak.
    await admin.from('platform_settings').update({ value: false }).eq('key', 'subscription_enforcement');
    if (trialDaysAdded && undoTrials) {
      try {
        await undoTrials(trialDaysAdded);
      } catch (err) {
        console.error(`✗ COULD NOT UNDO +${trialDaysAdded} trial days: ${String(err)}`);
      }
    }
    for (const id of created) {
      await admin.from('tailors').delete().eq('user_id', id);
      await admin.from('users').delete().eq('id', id);
      await admin.auth.admin.deleteUser(id);
    }
  }
  console.log('\nSubscription entitlement test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
