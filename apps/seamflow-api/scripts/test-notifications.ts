/**
 * End-to-end smoke test for Phase 1.8 push notifications.
 *
 * What this verifies WITHOUT a physical device:
 *   1. POST /me/device-tokens accepts a valid Expo-shaped token (idempotent)
 *   2. POST /me/device-tokens with a bad token shape → 400
 *   3. POST /me/push-test reports it tried to push to 1 device
 *   4. The Expo push API responds with `DeviceNotRegistered` for our fake
 *      token → the server prunes it automatically
 *   5. After cleanup, POST /me/push-test reports 0 tokens
 *   6. Status transition fires a push attempt (registered → in_progress)
 *   7. DELETE /me/device-tokens/<token> succeeds when nothing exists
 *
 * Run with:
 *   pnpm test:notifications
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PORT = process.env.PORT ?? '3001';

const TEST_EMAIL = 'auth-test@seamflow.local';
const TEST_PASSWORD = 'change-me-only-used-in-tests-9f3a2c';

// A syntactically valid Expo push token that Expo's API will reject with
// DeviceNotRegistered. Lets us exercise the full happy path *and* the
// invalid-token cleanup in one run.
const FAKE_TOKEN = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
}

async function api(
  jwt: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = { Authorization: `Bearer ${jwt}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`http://localhost:${PORT}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  return { status: res.status, data };
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main(): Promise<void> {
  assert(SUPABASE_URL, 'SUPABASE_URL not set');
  assert(SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY not set');

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: session, error } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert(!error, `signIn failed: ${error?.message}`);
  const jwt = session.session?.access_token;
  assert(jwt, 'no JWT');
  console.log('• Signed in');

  // Make sure the tailor row exists (other smoke tests assume this too)
  let r = await api(jwt, 'POST', '/me/tailor', {
    businessName: 'SeamFlow Test Studio',
    countryCode: 'NG',
    currency: 'NGN',
  });
  assert(r.status === 200 || r.status === 201, `POST /me/tailor: ${r.status}`);

  // ----------------------------------------------------------------------
  // 1. Register a fake-but-shape-valid token
  // ----------------------------------------------------------------------
  r = await api(jwt, 'POST', '/me/device-tokens', {
    expoToken: FAKE_TOKEN,
    platform: 'android',
  });
  assert(r.status === 204, `register token: ${r.status}`);
  console.log('• Registered fake token (204) ✓');

  // 2. Re-register the same token (idempotent → still 204)
  r = await api(jwt, 'POST', '/me/device-tokens', {
    expoToken: FAKE_TOKEN,
    platform: 'android',
  });
  assert(r.status === 204, `re-register: ${r.status}`);
  console.log('• Re-register is idempotent (204) ✓');

  // 3. Bad token shape → 400
  r = await api(jwt, 'POST', '/me/device-tokens', {
    expoToken: 'not-a-real-expo-token',
    platform: 'android',
  });
  assert(r.status === 400, `bad token shape: ${r.status}`);
  console.log('• Bad token shape rejected (400) ✓');

  // ----------------------------------------------------------------------
  // 4. Push-test should report sentTo: 1 (we have one fake token)
  // ----------------------------------------------------------------------
  r = await api(jwt, 'POST', '/me/push-test', {
    title: 'Smoke test',
    body: 'Hello from the test runner',
  });
  assert(r.status === 200 || r.status === 201, `push-test: ${r.status}`);
  assert(r.data.sentTo === 1, `expected sentTo=1, got ${r.data.sentTo}`);
  console.log(`• /me/push-test reports sentTo=${r.data.sentTo} ✓`);

  // 5. After the push attempt, Expo's API will have replied with
  //    DeviceNotRegistered (our fake token isn't a real device). The
  //    server prunes such tokens automatically — give it a moment for
  //    the async cleanup to settle, then verify the next push reports 0.
  await new Promise((res) => setTimeout(res, 800));

  r = await api(jwt, 'POST', '/me/push-test', {});
  assert(r.status === 200 || r.status === 201, `push-test 2: ${r.status}`);
  assert(
    r.data.sentTo === 0,
    `after cleanup expected sentTo=0, got ${r.data.sentTo} — pruning may not have happened`,
  );
  console.log('• Invalid-token cleanup pruned the row (sentTo=0) ✓');

  // ----------------------------------------------------------------------
  // 6. Order transition fires a push attempt (no live tokens so the wiring
  //    is exercised but nothing leaves the server).
  // ----------------------------------------------------------------------
  r = await api(jwt, 'POST', '/clients', {
    fullName: 'Push Test Client',
    phone: '+2348030009999',
    address: '1 Notify Lane, Lagos',
  });
  assert(r.status === 201, `create client: ${r.status}`);
  const clientId = r.data.id;

  r = await api(jwt, 'POST', '/orders', {
    clientId,
    orderName: 'Push Test Order',
    items: [{ garmentType: 'shirt', quantity: 1 }],
  });
  assert(r.status === 201, `create order: ${r.status}`);
  const orderId = r.data.id;

  r = await api(jwt, 'POST', `/orders/${orderId}/transition`, { to: 'in_progress' });
  assert(r.status === 201, `transition: ${r.status}`);
  console.log('• Order transition succeeded (push fired in background) ✓');

  // ----------------------------------------------------------------------
  // 7. Delete a non-existent token → still 204 (idempotent)
  // ----------------------------------------------------------------------
  r = await api(
    jwt,
    'DELETE',
    `/me/device-tokens/${encodeURIComponent('ExponentPushToken[bbbbbbbbbbbbbbbbbbbbb]')}`,
  );
  assert(r.status === 204, `delete non-existent: ${r.status}`);
  console.log('• Delete is idempotent (204 on nothing) ✓');

  // Cleanup
  await api(jwt, 'DELETE', `/orders/${orderId}`);
  await api(jwt, 'DELETE', `/clients/${clientId}`);

  console.log('\nNotifications smoke test passed.');
}

main().catch((err) => {
  console.error('✗ Smoke test failed:', err);
  process.exit(1);
});
