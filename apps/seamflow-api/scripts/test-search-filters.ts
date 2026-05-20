/**
 * Smoke test for Phase 1.10 search & filtering additions.
 *
 * Coverage:
 *   1. GET /clients?q=<name>       — trigram-backed fuzzy match on full_name
 *   2. GET /clients?q=<phone-frag> — trigram-backed match on phone column
 *   3. GET /clients?q=<garbage>    — empty result, 200
 *   4. GET /orders?status=...      — status filter (existing, regression check)
 *   5. GET /orders?q=<order name>  — free-text on order_name
 *   6. GET /orders?dueBefore=...   — only orders with delivery <= boundary
 *   7. GET /orders?dueAfter=...    — only orders with delivery >= boundary
 *   8. GET /orders?dueBefore=...&dueAfter=...  — range
 *
 * Run with:
 *   pnpm test:search-filters
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

  await api(jwt, 'POST', '/me/tailor', {
    businessName: 'SeamFlow Test Studio',
    countryCode: 'CM',
    currency: 'XAF',
  });

  // ----------------------------------------------------------------------
  // Seed three clients with distinctive names + phones
  // ----------------------------------------------------------------------
  const tag = Date.now().toString().slice(-6);
  const seedClients: Array<{ id: string; name: string }> = [];

  for (const c of [
    {
      fullName: `SearchTagAlpha ${tag}`,
      phone: `+2376${tag}10`,
      address: '1 Alpha Way',
    },
    {
      fullName: `SearchTagBeta ${tag}`,
      phone: `+2376${tag}20`,
      address: '2 Beta Way',
    },
    {
      fullName: `Unrelated Person ${tag}`,
      phone: `+2376${tag}30`,
      address: '3 Other Way',
    },
  ]) {
    const r = await api(jwt, 'POST', '/clients', c);
    assert(r.status === 201, `seed client: ${r.status}`);
    seedClients.push({ id: r.data.id, name: c.fullName });
  }
  console.log(`• Seeded 3 clients (tag=${tag})`);

  // ----------------------------------------------------------------------
  // 1. q=<name fragment> matches by name
  // ----------------------------------------------------------------------
  let r = await api(jwt, 'GET', `/clients?q=SearchTag`);
  assert(r.status === 200, `clients q name: ${r.status}`);
  const matchedNames = r.data.items
    .map((c: { fullName: string }) => c.fullName)
    .filter((n: string) => n.includes(tag));
  assert(
    matchedNames.length === 2,
    `expected 2 SearchTag matches, got ${matchedNames.length}`,
  );
  console.log(`• GET /clients?q=SearchTag → 2 matches ✓`);

  // 2. q=<phone fragment>
  r = await api(jwt, 'GET', `/clients?q=${tag}10`);
  assert(r.status === 200, `clients q phone: ${r.status}`);
  const phoneMatch = r.data.items.find(
    (c: { fullName: string }) => c.fullName === `SearchTagAlpha ${tag}`,
  );
  assert(phoneMatch, 'phone fragment did not match Alpha');
  console.log('• GET /clients?q=<phone-frag> → matched Alpha ✓');

  // 3. q=<garbage>
  r = await api(jwt, 'GET', `/clients?q=zzz-no-such-string-${tag}`);
  assert(r.status === 200, `clients q empty: ${r.status}`);
  assert(r.data.items.length === 0, 'expected empty result for garbage');
  console.log('• GET /clients?q=<garbage> → 0 matches ✓');

  // ----------------------------------------------------------------------
  // Seed orders for the Alpha client with varied delivery dates
  // ----------------------------------------------------------------------
  const alpha = seedClients[0];
  assert(alpha, 'no alpha client');

  const today = new Date();
  const inThreeDays = new Date(today);
  inThreeDays.setDate(today.getDate() + 3);
  const inTwentyDays = new Date(today);
  inTwentyDays.setDate(today.getDate() + 20);

  r = await api(jwt, 'POST', '/orders', {
    clientId: alpha.id,
    orderName: `WeddingSuit ${tag}`,
    dateDelivery: inThreeDays.toISOString(),
    items: [{ garmentType: 'suit', quantity: 1 }],
  });
  assert(r.status === 201, `seed order soon: ${r.status}`);
  const orderSoonId = r.data.id;

  r = await api(jwt, 'POST', '/orders', {
    clientId: alpha.id,
    orderName: `LinenAgbada ${tag}`,
    dateDelivery: inTwentyDays.toISOString(),
    items: [{ garmentType: 'agbada', quantity: 1 }],
  });
  assert(r.status === 201, `seed order later: ${r.status}`);
  const orderLaterId = r.data.id;

  r = await api(jwt, 'POST', '/orders', {
    clientId: alpha.id,
    orderName: `NoDateGown ${tag}`,
    items: [{ garmentType: 'gown', quantity: 1 }],
  });
  assert(r.status === 201, `seed order no-date: ${r.status}`);
  const orderNoDateId = r.data.id;
  console.log('• Seeded 3 orders (3d, 20d, no-date)');

  // ----------------------------------------------------------------------
  // 4. status filter regression
  // ----------------------------------------------------------------------
  r = await api(jwt, 'GET', `/orders?status=registered&clientId=${alpha.id}`);
  assert(r.status === 200, `status filter: ${r.status}`);
  assert(
    r.data.items.every((o: { status: string }) => o.status === 'registered'),
    'status filter leaked rows',
  );
  console.log('• GET /orders?status=registered ✓');

  // 5. q=<order-name fragment>
  r = await api(jwt, 'GET', `/orders?q=WeddingSuit`);
  assert(r.status === 200, `orders q: ${r.status}`);
  const namedHit = r.data.items.find(
    (o: { id: string }) => o.id === orderSoonId,
  );
  assert(namedHit, 'order name match missed');
  console.log('• GET /orders?q=WeddingSuit → hit ✓');

  // 6. dueBefore — only orders with dateDelivery <= boundary
  const boundary = new Date(today);
  boundary.setDate(today.getDate() + 7);
  r = await api(
    jwt,
    'GET',
    `/orders?clientId=${alpha.id}&dueBefore=${boundary.toISOString()}`,
  );
  assert(r.status === 200, `dueBefore: ${r.status}`);
  const ids = r.data.items.map((o: { id: string }) => o.id);
  assert(ids.includes(orderSoonId), 'soon order should be in dueBefore=+7d');
  assert(
    !ids.includes(orderLaterId),
    'later order should NOT be in dueBefore=+7d',
  );
  assert(
    !ids.includes(orderNoDateId),
    'no-date order should NOT be in dueBefore (NULL fails inequality)',
  );
  console.log('• GET /orders?dueBefore=+7d → soon yes, later no ✓');

  // 7. dueAfter
  r = await api(
    jwt,
    'GET',
    `/orders?clientId=${alpha.id}&dueAfter=${boundary.toISOString()}`,
  );
  assert(r.status === 200, `dueAfter: ${r.status}`);
  const idsAfter = r.data.items.map((o: { id: string }) => o.id);
  assert(idsAfter.includes(orderLaterId), 'later order should be in dueAfter=+7d');
  assert(
    !idsAfter.includes(orderSoonId),
    'soon order should NOT be in dueAfter=+7d',
  );
  console.log('• GET /orders?dueAfter=+7d → later yes, soon no ✓');

  // 8. range: dueAfter today AND dueBefore +30d → both soon + later
  const farBoundary = new Date(today);
  farBoundary.setDate(today.getDate() + 30);
  r = await api(
    jwt,
    'GET',
    `/orders?clientId=${alpha.id}&dueAfter=${today.toISOString()}&dueBefore=${farBoundary.toISOString()}`,
  );
  assert(r.status === 200, `range: ${r.status}`);
  const idsRange = r.data.items.map((o: { id: string }) => o.id);
  assert(idsRange.includes(orderSoonId), 'soon order should be in range');
  assert(idsRange.includes(orderLaterId), 'later order should be in range');
  console.log('• GET /orders?dueAfter=now&dueBefore=+30d → both ✓');

  // ----------------------------------------------------------------------
  // Cleanup
  // ----------------------------------------------------------------------
  await api(jwt, 'DELETE', `/orders/${orderSoonId}`);
  await api(jwt, 'DELETE', `/orders/${orderLaterId}`);
  await api(jwt, 'DELETE', `/orders/${orderNoDateId}`);
  for (const c of seedClients) {
    await api(jwt, 'DELETE', `/clients/${c.id}`);
  }
  console.log('• Cleanup done');

  console.log('\nSearch & filters smoke test passed.');
}

main().catch((err) => {
  console.error('✗ Smoke test failed:', err);
  process.exit(1);
});
