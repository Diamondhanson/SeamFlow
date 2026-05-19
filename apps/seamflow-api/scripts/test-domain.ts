/**
 * End-to-end smoke test for the Phase 1.1 domain endpoints.
 *
 * Requires the dev server running on PORT. Run with:
 *   pnpm test:domain
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
  assert(SUPABASE_URL, 'SUPABASE_URL not set in env');
  assert(SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY not set in env');

  // Sign in as the test user from Phase 0.6
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: session, error } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert(!error, `signIn failed: ${error?.message}`);
  const jwt = session.session?.access_token;
  assert(jwt, 'no access_token returned');
  console.log('• Signed in as test user');

  // 1. Upsert tailor profile (idempotent)
  let r = await api(jwt, 'POST', '/me/tailor', {
    businessName: 'SeamFlow Test Studio',
    countryCode: 'NG',
    currency: 'NGN',
    location: 'Lagos',
  });
  assert(r.status === 201 || r.status === 200, `POST /me/tailor: ${r.status}`);
  const tailorId = r.data.id;
  console.log(`• Tailor: ${tailorId}`);

  // 2. /me now returns the tailor
  r = await api(jwt, 'GET', '/me');
  assert(r.status === 200, `GET /me: ${r.status}`);
  assert(r.data.tailor?.id === tailorId, '/me missing tailor');
  console.log('• /me includes tailor');

  // 3. Create a client
  r = await api(jwt, 'POST', '/clients', {
    fullName: 'Adaeze Okeke',
    phone: '+2348031234567',
    email: 'adaeze@example.com',
    notes: 'Prefers structured shoulders',
  });
  assert(r.status === 201, `POST /clients: ${r.status}`);
  const clientId = r.data.id;
  assert(r.data.tailorId === tailorId, 'client.tailorId mismatch');
  console.log(`• Client created: ${clientId}`);

  // 4. List clients
  r = await api(jwt, 'GET', '/clients?limit=10');
  assert(r.status === 200, `GET /clients: ${r.status}`);
  assert(Array.isArray(r.data.items), 'clients list shape wrong');
  assert(
    r.data.items.some((c: any) => c.id === clientId),
    'created client missing from list',
  );
  console.log(`• Client list returned ${r.data.items.length} item(s)`);

  // 5. Get single client
  r = await api(jwt, 'GET', `/clients/${clientId}`);
  assert(r.status === 200, `GET /clients/:id: ${r.status}`);
  assert(r.data.fullName === 'Adaeze Okeke', 'client name mismatch');
  console.log('• GET /clients/:id ok');

  // 6. Update client
  r = await api(jwt, 'PATCH', `/clients/${clientId}`, {
    notes: 'Prefers structured shoulders. Likes silk.',
  });
  assert(r.status === 200, `PATCH /clients: ${r.status}`);
  assert(/silk/.test(r.data.notes), 'patch did not stick');
  console.log('• PATCH /clients/:id ok');

  // 7. Create measurement set
  r = await api(jwt, 'POST', `/clients/${clientId}/measurement-sets`, {
    label: 'default',
    values: { chest: 88, waist: 70, hips: 96, shoulder: 38 },
  });
  assert(r.status === 201, `POST measurement-sets: ${r.status}`);
  const setId = r.data.id;
  assert(r.data.clientId === clientId, 'measurementSet.clientId mismatch');
  console.log(`• Measurement set created: ${setId}`);

  // 8. List sets for client
  r = await api(jwt, 'GET', `/clients/${clientId}/measurement-sets`);
  assert(r.status === 200, `GET measurement-sets: ${r.status}`);
  assert(r.data.items.length >= 1, 'measurement sets list empty');
  console.log(`• Measurement sets list returned ${r.data.items.length} item(s)`);

  // 9. Update measurement set
  r = await api(jwt, 'PATCH', `/measurement-sets/${setId}`, {
    values: { chest: 89, waist: 70, hips: 96, shoulder: 38 },
  });
  assert(r.status === 200, `PATCH measurement-set: ${r.status}`);
  assert(r.data.values.chest === 89, 'measurement update did not stick');
  console.log('• PATCH /measurement-sets/:id ok');

  // 10. Delete measurement set
  r = await api(jwt, 'DELETE', `/measurement-sets/${setId}`);
  assert(r.status === 204, `DELETE measurement-set: ${r.status}`);
  r = await api(jwt, 'GET', `/measurement-sets/${setId}`);
  assert(r.status === 404, `GET deleted set: expected 404, got ${r.status}`);
  console.log('• DELETE /measurement-sets/:id ok');

  // 11. Cross-tenant safety: a made-up UUID must 404, not 403
  const fakeId = '00000000-0000-0000-0000-000000000000';
  r = await api(jwt, 'GET', `/clients/${fakeId}`);
  assert(r.status === 404, `GET /clients/<fake>: expected 404, got ${r.status}`);
  console.log('• Cross-tenant probe → 404');

  // 12. Validation: missing required field
  r = await api(jwt, 'POST', '/clients', { phone: '+1234567890' });
  assert(
    r.status === 400 || r.status === 422,
    `POST /clients without fullName: expected 4xx, got ${r.status}`,
  );
  console.log('• Validation rejects missing fullName');

  // 13. Clean up the client
  r = await api(jwt, 'DELETE', `/clients/${clientId}`);
  assert(r.status === 204, `DELETE /clients/:id: ${r.status}`);
  console.log('• Cleanup: client deleted');

  console.log('\nDomain smoke test passed.');
}

main().catch((err) => {
  console.error('✗ Smoke test failed:', err);
  process.exit(1);
});
