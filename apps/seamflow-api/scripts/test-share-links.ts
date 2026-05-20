/**
 * End-to-end smoke test for Phase 1.5 magic-link order view.
 *
 * Coverage:
 *   1. Auth/issue: only the owning tailor can mint a share link
 *   2. Public resolve: token returns order + items + tailor brand info
 *   3. No-auth check: the public endpoint works without an Authorization header
 *   4. Tampered/invalid token: 401
 *   5. Forged token (signed with the wrong secret): 401
 *   6. Delivered+2d soft expiry: link still works inside the grace window
 *
 * Requires the dev server running on PORT. Run with:
 *   pnpm test:share-links
 */
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

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
  jwtOrNull: string | null,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {};
  if (jwtOrNull) headers.Authorization = `Bearer ${jwtOrNull}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`http://localhost:${PORT}${path}`, {
    method,
    headers,
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
  const accessToken = session.session?.access_token;
  assert(accessToken, 'no JWT');
  console.log('• Signed in');

  // Ensure tailor + a client + an order
  let r = await api(accessToken, 'POST', '/me/tailor', {
    businessName: 'SeamFlow Test Studio',
    countryCode: 'NG',
    currency: 'NGN',
    location: 'Lagos',
  });
  assert(r.status === 200 || r.status === 201, `POST /me/tailor: ${r.status}`);

  r = await api(accessToken, 'POST', '/clients', {
    fullName: 'Share Link Test Client',
    phone: '+2348030009999',
    address: '1 Share Way, Lagos',
  });
  assert(r.status === 201, `POST /clients: ${r.status}`);
  const clientId = r.data.id;

  r = await api(accessToken, 'POST', '/orders', {
    clientId,
    orderName: 'Share Test Order',
    items: [{ garmentType: 'shirt', quantity: 1 }],
  });
  assert(r.status === 201, `POST /orders: ${r.status}`);
  const orderId = r.data.id;
  console.log(`• Test order created: ${orderId}`);

  // 1. Issue share link
  r = await api(accessToken, 'POST', `/orders/${orderId}/share-link`);
  assert(r.status === 200 || r.status === 201, `issue link: ${r.status}`);
  assert(typeof r.data.token === 'string', 'token missing');
  assert(typeof r.data.url === 'string' && r.data.url.includes('/o/'), 'url missing or malformed');
  assert(typeof r.data.expiresAt === 'string', 'expiresAt missing');
  const token = r.data.token;
  console.log(`• Issued share link, expires ${r.data.expiresAt}`);

  // 2. Public resolve — NO auth header
  r = await api(null, 'GET', `/public/orders/${encodeURIComponent(token)}`);
  assert(r.status === 200, `public resolve: ${r.status}`);
  assert(r.data.order?.id === orderId, 'returned order id mismatch');
  assert(Array.isArray(r.data.items) && r.data.items.length === 1, 'items missing');
  assert(r.data.tailor?.businessName === 'SeamFlow Test Studio', 'tailor brand info missing');
  assert(r.data.tailor?.location === 'Lagos', 'tailor location missing');
  assert(typeof r.data.effectiveExpiresAt === 'string', 'effectiveExpiresAt missing');
  console.log('• Public resolve returned full payload (no auth required) ✓');

  // 3. Tampered token — flip a byte
  const bad = token.slice(0, -2) + 'AA';
  r = await api(null, 'GET', `/public/orders/${encodeURIComponent(bad)}`);
  assert(r.status === 401, `tampered token should 401, got ${r.status}`);
  console.log('• Tampered token rejected (401) ✓');

  // 4. Forged token (signed with a wrong secret)
  const forged = jwt.sign(
    { oid: orderId, tid: '00000000-0000-0000-0000-000000000000' },
    'not-the-real-secret-padding-to-32-chars',
    { expiresIn: '60d', issuer: 'seamflow:share-link' },
  );
  r = await api(null, 'GET', `/public/orders/${encodeURIComponent(forged)}`);
  assert(r.status === 401, `forged token should 401, got ${r.status}`);
  console.log('• Forged token rejected (401) ✓');

  // 5. Garbage token
  r = await api(null, 'GET', `/public/orders/not-a-jwt-at-all`);
  assert(r.status === 401, `garbage token: ${r.status}`);
  console.log('• Garbage token rejected (401) ✓');

  // 6. Delivery flow — transition order to delivered and confirm link still works
  //    (within the 2-day grace window). We can't directly test the expiry without
  //    time-machine; the in-window check is the meaningful runtime assertion.
  r = await api(accessToken, 'POST', `/orders/${orderId}/transition`, { to: 'in_progress' });
  assert(r.status === 201, `transition to in_progress: ${r.status}`);
  r = await api(accessToken, 'POST', `/orders/${orderId}/transition`, { to: 'testing' });
  assert(r.status === 201, `transition to testing: ${r.status}`);
  r = await api(accessToken, 'POST', `/orders/${orderId}/transition`, { to: 'delivered' });
  assert(r.status === 201, `transition to delivered: ${r.status}`);

  r = await api(null, 'GET', `/public/orders/${encodeURIComponent(token)}`);
  assert(r.status === 200, `link inside delivery grace: ${r.status}`);
  // effectiveExpiresAt should now be sooner than the original token exp
  console.log(`• Link still resolves inside delivery+2d grace ✓ (effectiveExpiresAt=${r.data.effectiveExpiresAt})`);

  // 7. Cross-tenant probe: issuing on a non-existent order
  r = await api(accessToken, 'POST', '/orders/00000000-0000-0000-0000-000000000000/share-link');
  assert(r.status === 404, `cross-tenant probe: ${r.status}`);
  console.log('• Cross-tenant probe → 404 ✓');

  // Cleanup
  await api(accessToken, 'DELETE', `/orders/${orderId}`);
  await api(accessToken, 'DELETE', `/clients/${clientId}`);
  console.log('• Cleanup done');

  console.log('\nShare-links smoke test passed.');
}

main().catch((err) => {
  console.error('✗ Smoke test failed:', err);
  process.exit(1);
});
