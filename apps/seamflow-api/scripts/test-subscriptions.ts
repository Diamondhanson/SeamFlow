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
 *
 * Throwaway accounts; the calendar is driven by the dev-only hooks rather than
 * by waiting six weeks. Run with: pnpm test:subscriptions
 */
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

async function main(): Promise<void> {
  assert(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY, 'Supabase env not set');
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const created: string[] = [];

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
    assert(sub.enforced === false, 'enforcement should ship OFF');
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

    // ...and nothing is blocked yet, because nobody can pay yet.
    r = await api(jwt, 'POST', '/clients', { fullName: 'Second Client', phone: '+237600000002', address: 'Douala' });
    assert(r.status === 201, `with enforcement off, creating should still work: ${r.status}`);
    console.log('• With enforcement off, a Free tailor is not blocked from anything');

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
  } finally {
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
