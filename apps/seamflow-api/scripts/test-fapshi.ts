/**
 * Fapshi sandbox check (ROADMAP appendix I.12).
 *
 * Proves OUR half of the integration against the real sandbox:
 *   · checkout reaches Fapshi and comes back with a hosted checkout link
 *   · a webhook carrying the right secret settles the payment and extends the
 *     subscription by the plan's days
 *   · a webhook with the WRONG secret changes nothing
 *
 * What it cannot do is press the buttons on Fapshi's page — that part is
 * manual, with one of their test numbers (670000000 succeeds, 670000001
 * fails). The link is printed so you can.
 *
 * Needs the dev server running with:
 *   SUBSCRIPTION_PAYMENT_PROVIDER=fapshi
 *   FAPSHI_ENV=sandbox, FAPSHI_API_USER, FAPSHI_API_KEY, FAPSHI_WEBHOOK_SECRET
 * Run with: pnpm test:fapshi
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_SECRET = process.env.FAPSHI_WEBHOOK_SECRET;
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
  assert(WEBHOOK_SECRET, 'FAPSHI_WEBHOOK_SECRET not set — the webhook half cannot be tested');
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const created: string[] = [];

  try {
    const email = `fapshi-test-${Date.now()}@seamflow.local`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    assert(!error, `createUser: ${error?.message}`);
    created.push(data.user!.id);
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const s = await anon.auth.signInWithPassword({ email, password: PASSWORD });
    const jwt = s.data.session!.access_token;
    await api(jwt, 'GET', '/me');
    // Cameroon, so the tailor is offered francs and mobile money.
    await api(jwt, 'POST', '/me/tailor', { businessName: 'Fapshi Test Studio', countryCode: 'CM', currency: 'XAF' });
    const tailorId = (await api(jwt, 'GET', '/me')).data.tailor.id;

    let r = await api(jwt, 'GET', '/me/subscription');
    assert(r.data.billing.currency === 'XAF', `expected XAF pricing, got ${r.data.billing.currency}`);

    // ---- Checkout reaches Fapshi -------------------------------------------
    r = await api(jwt, 'POST', '/subscriptions/checkout', { plan: 'monthly', method: 'mtn_momo' });
    assert(r.status === 201 || r.status === 200, `checkout: ${r.status} ${JSON.stringify(r.data)}`);
    const { paymentId, redirectUrl, status } = r.data;
    assert(status === 'pending', `expected pending, got ${status}`);
    assert(typeof redirectUrl === 'string' && redirectUrl.includes('fapshi'), `no Fapshi link: ${redirectUrl}`);
    console.log('• Checkout reached Fapshi and returned a hosted checkout link');
    console.log(`    ${redirectUrl}`);
    console.log('    (open it and pay with 670000000 to see a real sandbox success)');

    // ---- A webhook with the wrong secret changes nothing --------------------
    const payload = (st: string) =>
      JSON.stringify({
        transId: `test_${paymentId}`,
        status: st,
        medium: 'mobile money',
        amount: 3000,
        externalId: paymentId,
        userId: tailorId,
      });
    let res = await fetch(`http://localhost:${PORT}/subscriptions/webhook/fapshi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-wh-secret': 'wrong-secret' },
      body: payload('SUCCESSFUL'),
    });
    assert((await res.json()).handled === false, 'a webhook with the wrong secret was accepted');
    r = await api(jwt, 'GET', `/subscriptions/payments/${paymentId}`);
    assert(r.data.status === 'pending', 'a forged webhook changed a payment');
    console.log('• A webhook with the wrong secret is refused');

    // ---- The real thing -----------------------------------------------------
    // Paying during a trial ADDS to it — the tailor keeps what they were
    // promised, so this is trial days plus the plan's 30.
    const before = (await api(jwt, 'GET', '/me/subscription')).data.daysLeft;
    res = await fetch(`http://localhost:${PORT}/subscriptions/webhook/fapshi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-wh-secret': WEBHOOK_SECRET },
      body: payload('SUCCESSFUL'),
    });
    assert((await res.json()).handled === true, 'a correctly signed webhook was not handled');
    r = await api(jwt, 'GET', `/subscriptions/payments/${paymentId}`);
    assert(r.data.status === 'succeeded', `payment not settled: ${r.data.status}`);
    const after = (await api(jwt, 'GET', '/me/subscription')).data;
    assert(after.premium && after.daysLeft >= before + 29, `expected +30 days, ${before} → ${after.daysLeft}`);
    console.log(`• A signed webhook settles the payment and adds 30 days (${before} → ${after.daysLeft})`);
  } finally {
    for (const id of created) {
      await admin.from('tailors').delete().eq('user_id', id);
      await admin.from('users').delete().eq('id', id);
      await admin.auth.admin.deleteUser(id);
    }
  }
  console.log('\nFapshi sandbox check passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
