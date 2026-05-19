/**
 * End-to-end smoke test for Phase 1.4.1 — sync pull endpoint.
 *
 * Exercises the full lifecycle: create → pull → update → pull → delete → pull.
 * Run with:
 *   pnpm test:sync
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PORT = process.env.PORT ?? '3001';

const TEST_EMAIL = 'auth-test@seamflow.local';
const TEST_PASSWORD = 'change-me-only-used-in-tests-9f3a2c';

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
  const res = await fetch(`http://localhost:${PORT}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { status: res.status, data };
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

  // Ensure tailor exists
  await api(jwt, 'POST', '/me/tailor', {
    businessName: 'SeamFlow Test Studio',
    countryCode: 'NG',
    currency: 'NGN',
  });

  // 1. Initial full pull — note the timestamp for use later as a checkpoint
  let r = await api(jwt, 'POST', '/sync/pull', {});
  assert(r.status === 201, `POST /sync/pull (initial): ${r.status}`);
  assert(typeof r.data.timestamp === 'string', 'timestamp missing');
  const checkpoint1 = r.data.timestamp;
  console.log(`• Initial pull at ${checkpoint1}`);
  console.log(
    `  initial counts: clients=${r.data.changes.clients.created.length}, ` +
      `orders=${r.data.changes.orders.created.length}, ` +
      `groups=${r.data.changes.groupOrders.created.length}`,
  );

  // 2. Create a client AFTER checkpoint1
  await new Promise((r) => setTimeout(r, 1100)); // ensure clock advanced beyond pg's `now()` resolution
  r = await api(jwt, 'POST', '/clients', {
    fullName: 'Sync Test Client',
    phone: '+2348039999998',
  });
  assert(r.status === 201, `POST /clients: ${r.status}`);
  const clientId = r.data.id;
  console.log(`• Created client: ${clientId}`);

  // 3. Pull with checkpoint1 — should see this new client as 'created'
  r = await api(jwt, 'POST', '/sync/pull', { lastPulledAt: checkpoint1 });
  assert(r.status === 201, `POST /sync/pull (delta): ${r.status}`);
  assert(
    r.data.changes.clients.created.some((c: any) => c.id === clientId),
    'new client missing from delta',
  );
  assert(
    !r.data.changes.clients.updated.some((c: any) => c.id === clientId),
    'new client should be in created, not updated',
  );
  const checkpoint2 = r.data.timestamp;
  console.log(`• Delta pull saw new client as created ✓`);

  // 4. Update the client AFTER checkpoint2
  await new Promise((r) => setTimeout(r, 1100));
  r = await api(jwt, 'PATCH', `/clients/${clientId}`, { notes: 'updated for sync test' });
  assert(r.status === 200, `PATCH /clients: ${r.status}`);

  // 5. Pull with checkpoint2 — should see this client as 'updated'
  r = await api(jwt, 'POST', '/sync/pull', { lastPulledAt: checkpoint2 });
  assert(
    r.data.changes.clients.updated.some((c: any) => c.id === clientId),
    'updated client missing from updated[]',
  );
  assert(
    !r.data.changes.clients.created.some((c: any) => c.id === clientId),
    'updated client should not appear in created[] (it predates the checkpoint)',
  );
  const checkpoint3 = r.data.timestamp;
  console.log(`• Delta pull saw update ✓`);

  // 6. Delete the client AFTER checkpoint3
  await new Promise((r) => setTimeout(r, 1100));
  r = await api(jwt, 'DELETE', `/clients/${clientId}`);
  assert(r.status === 204, `DELETE /clients: ${r.status}`);

  // 7. Pull with checkpoint3 — should see this id in deleted[]
  r = await api(jwt, 'POST', '/sync/pull', { lastPulledAt: checkpoint3 });
  assert(
    r.data.changes.clients.deleted.includes(clientId),
    `deleted client missing from tombstones: ${JSON.stringify(r.data.changes.clients.deleted)}`,
  );
  console.log('• Delta pull saw deletion ✓');

  // 8. Pull with the LATEST timestamp — should return no changes
  r = await api(jwt, 'POST', '/sync/pull', { lastPulledAt: r.data.timestamp });
  const total =
    r.data.changes.clients.created.length +
    r.data.changes.clients.updated.length +
    r.data.changes.clients.deleted.length +
    r.data.changes.orders.created.length +
    r.data.changes.orders.updated.length +
    r.data.changes.orders.deleted.length;
  assert(total === 0, `expected 0 changes after fresh pull, got ${total}`);
  console.log('• Idle pull (no new changes) returns 0 deltas ✓');

  console.log('\nSync smoke test passed.');
}

main().catch((err) => {
  console.error('✗ Smoke test failed:', err);
  process.exit(1);
});
