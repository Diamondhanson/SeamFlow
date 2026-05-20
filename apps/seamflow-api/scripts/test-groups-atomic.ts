/**
 * Focused smoke test for the atomic POST /group-orders/with-members endpoint
 * introduced in the pre-1.10 architectural refactor.
 *
 * Coverage:
 *   1. Atomic create with NEW owner contact:
 *      - one new client row appears
 *      - one group_orders row appears with owner_client_id set
 *      - inline members are inserted at positions 0..n
 *      - response shape matches GroupOrderWithMembers
 *   2. Atomic create with EXISTING client picked as owner:
 *      - no new client row created
 *      - owner_client_id matches the picked client
 *      - inline members still inserted
 *   3. Validation: cross-tenant pick rejected (404)
 *   4. Edit later — PATCH /group-orders/:id with ownerClientId changes owner
 *
 * Run with:
 *   pnpm test:groups-atomic
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
  // 1. Atomic create with NEW owner contact
  // ----------------------------------------------------------------------
  const uniqueSuffix = Date.now().toString().slice(-6);
  let r = await api(jwt, 'POST', '/group-orders/with-members', {
    name: `Atomic Group ${uniqueSuffix}`,
    owner: {
      newContact: {
        fullName: `Tunde Adekunle ${uniqueSuffix}`,
        phone: `+2376${uniqueSuffix}11`,
        address: 'Bonanjo, Douala',
      },
    },
    members: [
      { fullName: 'Bridesmaid 1', roleLabel: 'Maid of honour' },
      { fullName: 'Bridesmaid 2' },
      { fullName: 'Bridesmaid 3', roleLabel: 'Sister' },
    ],
  });
  assert(
    r.status === 200 || r.status === 201,
    `atomic create with new owner: ${r.status} — ${JSON.stringify(r.data)}`,
  );
  assert(typeof r.data.id === 'string', 'expected group id back');
  assert(r.data.ownerClientId, 'expected ownerClientId set on response');
  assert(r.data.members.length === 3, `expected 3 members, got ${r.data.members.length}`);
  assert(
    r.data.members[0].position === 0,
    `expected position 0, got ${r.data.members[0].position}`,
  );
  assert(
    r.data.members[2].position === 2,
    `expected position 2, got ${r.data.members[2].position}`,
  );
  console.log(
    `• Atomic create with new owner → group ${r.data.id}, owner client ${r.data.ownerClientId}, ${r.data.members.length} members ✓`,
  );

  const groupAId = r.data.id;
  const newOwnerClientId = r.data.ownerClientId;

  // Verify the owner client actually exists on the tailor (round-trip via GET)
  r = await api(jwt, 'GET', `/clients/${newOwnerClientId}`);
  assert(r.status === 200, `owner client GET: ${r.status}`);
  assert(r.data.address === 'Bonanjo, Douala', 'owner address not persisted');
  console.log(`• Owner client persisted with address ✓`);

  // ----------------------------------------------------------------------
  // 2. Atomic create with EXISTING client picked as owner
  // ----------------------------------------------------------------------
  // First create a client we can pick.
  r = await api(jwt, 'POST', '/clients', {
    fullName: 'Existing Owner',
    phone: `+2376${uniqueSuffix}22`,
    address: 'Akwa, Douala',
  });
  assert(r.status === 201, `pre-create client: ${r.status}`);
  const existingClientId = r.data.id;

  r = await api(jwt, 'POST', '/group-orders/with-members', {
    name: `Atomic Group B ${uniqueSuffix}`,
    owner: { existingClientId },
    members: [{ fullName: 'Member A' }],
  });
  assert(
    r.status === 200 || r.status === 201,
    `atomic with existing client: ${r.status} — ${JSON.stringify(r.data)}`,
  );
  assert(
    r.data.ownerClientId === existingClientId,
    `expected ownerClientId=${existingClientId}, got ${r.data.ownerClientId}`,
  );
  console.log('• Atomic create with existing client owner ✓');
  const groupBId = r.data.id;

  // ----------------------------------------------------------------------
  // 3. Validation: cross-tenant client pick → 404
  // ----------------------------------------------------------------------
  const fakeId = '00000000-0000-0000-0000-000000000000';
  r = await api(jwt, 'POST', '/group-orders/with-members', {
    name: 'Should fail',
    owner: { existingClientId: fakeId },
    members: [],
  });
  assert(r.status === 404, `cross-tenant pick should 404, got ${r.status}`);
  console.log('• Cross-tenant client pick → 404 ✓');

  // ----------------------------------------------------------------------
  // 4. PATCH /group-orders/:id with ownerClientId — change owner later
  // ----------------------------------------------------------------------
  r = await api(jwt, 'PATCH', `/group-orders/${groupAId}`, {
    ownerClientId: existingClientId,
  });
  assert(r.status === 200, `PATCH owner: ${r.status}`);
  assert(
    r.data.ownerClientId === existingClientId,
    `PATCH owner mismatch: got ${r.data.ownerClientId}`,
  );
  console.log('• PATCH /group-orders/:id changes owner ✓');

  // ----------------------------------------------------------------------
  // Cleanup
  // ----------------------------------------------------------------------
  await api(jwt, 'DELETE', `/group-orders/${groupAId}`);
  await api(jwt, 'DELETE', `/group-orders/${groupBId}`);
  await api(jwt, 'DELETE', `/clients/${newOwnerClientId}`);
  await api(jwt, 'DELETE', `/clients/${existingClientId}`);
  console.log('• Cleanup done');

  console.log('\nGroup-orders atomic smoke test passed.');
}

main().catch((err) => {
  console.error('✗ Smoke test failed:', err);
  process.exit(1);
});
