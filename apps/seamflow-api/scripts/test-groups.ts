/**
 * End-to-end smoke test for the Phase 1.1 Group Orders + Members endpoints.
 *
 * Requires the dev server running on PORT. Run with:
 *   pnpm test:groups
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

  // Setup: ensure tailor + a base client with a measurement set
  let r = await api(jwt, 'POST', '/me/tailor', {
    businessName: 'SeamFlow Test Studio',
    countryCode: 'NG',
    currency: 'NGN',
  });
  assert(r.status === 200 || r.status === 201, `POST /me/tailor: ${r.status}`);

  r = await api(jwt, 'POST', '/clients', {
    fullName: 'Adaeze Okeke',
    phone: '+2348031234567',
  });
  assert(r.status === 201, `POST /clients: ${r.status}`);
  const baseClientId = r.data.id;
  console.log(`• Base client: ${baseClientId}`);

  r = await api(jwt, 'POST', `/clients/${baseClientId}/measurement-sets`, {
    label: 'default',
    values: { chest: 88, waist: 70, hips: 96 },
  });
  assert(r.status === 201, `POST measurement-sets: ${r.status}`);
  console.log('• Adaeze measurement set seeded');

  // 1. Create group order
  r = await api(jwt, 'POST', '/group-orders', {
    name: 'Adaeze Wedding Party 2026-08-15',
    description: 'Maid of honor + 3 bridesmaids',
    eventDate: '2026-08-15T00:00:00.000Z',
    dateDelivery: '2026-08-10T00:00:00.000Z',
    currency: 'NGN',
  });
  assert(r.status === 201, `POST /group-orders: ${r.status}`);
  const groupId = r.data.id;
  assert(r.data.status === 'planning', `expected status=planning, got ${r.data.status}`);
  console.log(`• Group order: ${groupId}`);

  // 2. List group orders — at least 1
  r = await api(jwt, 'GET', '/group-orders?limit=10');
  assert(r.status === 200, `GET /group-orders: ${r.status}`);
  assert(r.data.items.some((g: any) => g.id === groupId), 'group missing from list');
  console.log(`• List returned ${r.data.items.length} group order(s)`);

  // 3. Add member 1 (linked to existing client)
  r = await api(jwt, 'POST', `/group-orders/${groupId}/members`, {
    fullName: 'Adaeze Okeke',
    clientId: baseClientId,
    roleLabel: 'Bride',
    position: 0,
  });
  assert(r.status === 201, `POST members: ${r.status}`);
  const member1Id = r.data.id;
  assert(r.data.clientId === baseClientId, 'member 1 clientId not set');
  console.log(`• Member 1 (linked): ${member1Id}`);

  // 4. Add member 2 (ad-hoc)
  r = await api(jwt, 'POST', `/group-orders/${groupId}/members`, {
    fullName: 'Sarah Bridesmaid',
    roleLabel: 'Maid of Honor',
    position: 1,
  });
  assert(r.status === 201, `POST member 2: ${r.status}`);
  const member2Id = r.data.id;
  assert(r.data.clientId == null, 'ad-hoc member should have null clientId');
  console.log(`• Member 2 (ad-hoc): ${member2Id}`);

  // 5. Add member 3 (ad-hoc, will be deleted)
  r = await api(jwt, 'POST', `/group-orders/${groupId}/members`, {
    fullName: 'Tina Bridesmaid',
    position: 2,
  });
  assert(r.status === 201, `POST member 3: ${r.status}`);
  const member3Id = r.data.id;
  console.log(`• Member 3 (ad-hoc): ${member3Id}`);

  // 6. List members → 3
  r = await api(jwt, 'GET', `/group-orders/${groupId}/members`);
  assert(r.status === 200, `GET members: ${r.status}`);
  assert(r.data.items.length === 3, `expected 3 members, got ${r.data.items.length}`);
  console.log('• 3 members in group');

  // 7. Copy measurements from linked client onto member 1
  r = await api(
    jwt,
    'POST',
    `/group-order-members/${member1Id}/copy-measurements-from-client`,
  );
  assert(r.status === 201, `copy-measurements: ${r.status}`);
  assert(r.data.measurements.chest === 88, 'copied measurements missing chest=88');
  console.log('• copy-measurements seeded member 1 from client');

  // 8. Update member 2's measurements manually
  r = await api(jwt, 'PATCH', `/group-order-members/${member2Id}`, {
    measurements: { chest: 92, waist: 74, hips: 98 },
  });
  assert(r.status === 200, `PATCH member 2: ${r.status}`);
  assert(r.data.measurements.waist === 74, 'patch did not stick');
  console.log('• Member 2 measurements set manually');

  // 9. Promote member 2 to client
  r = await api(
    jwt,
    'POST',
    `/group-order-members/${member2Id}/promote-to-client`,
    { phone: '+2348039999999' },
  );
  assert(r.status === 201, `promote-to-client: ${r.status}`);
  const promotedClientId = r.data.client.id;
  assert(r.data.member.clientId === promotedClientId, 'member.clientId not set');
  assert(r.data.client.fullName === 'Sarah Bridesmaid', 'promoted client name wrong');
  console.log(`• Member 2 promoted to client: ${promotedClientId}`);

  // 10. Promoting again must 409
  r = await api(
    jwt,
    'POST',
    `/group-order-members/${member2Id}/promote-to-client`,
    { phone: '+2348039999999' },
  );
  assert(r.status === 409, `re-promote should 409, got ${r.status}`);
  console.log('• Re-promote → 409 conflict');

  // 11. GET group order with embedded members
  r = await api(jwt, 'GET', `/group-orders/${groupId}`);
  assert(r.status === 200, `GET /group-orders/:id: ${r.status}`);
  assert(Array.isArray(r.data.members), 'members array missing');
  assert(r.data.members.length === 3, `expected 3 embedded members`);
  console.log('• GET /group-orders/:id includes members');

  // 12. Delete member 3
  r = await api(jwt, 'DELETE', `/group-order-members/${member3Id}`);
  assert(r.status === 204, `DELETE member: ${r.status}`);
  r = await api(jwt, 'GET', `/group-orders/${groupId}/members`);
  assert(r.data.items.length === 2, `expected 2 members after delete, got ${r.data.items.length}`);
  console.log('• Member 3 deleted');

  // 13. Update group order status
  r = await api(jwt, 'PATCH', `/group-orders/${groupId}`, {
    status: 'in_progress',
  });
  assert(r.status === 200, `PATCH /group-orders: ${r.status}`);
  assert(r.data.status === 'in_progress', 'status patch did not stick');
  console.log('• Group status → in_progress');

  // 14. Cross-tenant probe
  r = await api(jwt, 'GET', '/group-orders/00000000-0000-0000-0000-000000000000');
  assert(r.status === 404, `cross-tenant probe: expected 404, got ${r.status}`);
  console.log('• Cross-tenant probe → 404');

  // 15. Delete group → members cascade away
  r = await api(jwt, 'DELETE', `/group-orders/${groupId}`);
  assert(r.status === 204, `DELETE /group-orders: ${r.status}`);
  r = await api(jwt, 'GET', `/group-order-members/${member1Id}`);
  assert(r.status === 404, `member 1 should be cascade-deleted, got ${r.status}`);
  console.log('• Group deleted → members cascaded');

  // Cleanup
  await api(jwt, 'DELETE', `/clients/${promotedClientId}`);
  // Don't delete baseClient — measurement set blocks it; the test-domain script
  // handles its own client cleanup. We leave Adaeze for re-runs to find.

  console.log('\nGroup orders smoke test passed.');
}

main().catch((err) => {
  console.error('✗ Smoke test failed:', err);
  process.exit(1);
});
