/**
 * End-to-end smoke test for Phase 1.2 Orders endpoints.
 *
 * Requires the dev server running on PORT. Run with:
 *   pnpm test:orders
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

  // Ensure tailor + a client to attach orders to
  let r = await api(jwt, 'POST', '/me/tailor', {
    businessName: 'SeamFlow Test Studio',
    countryCode: 'NG',
    currency: 'NGN',
  });
  assert(r.status === 200 || r.status === 201, `POST /me/tailor: ${r.status}`);

  r = await api(jwt, 'POST', '/clients', {
    fullName: 'Order Test Client',
    phone: '+2348030000001',
  });
  assert(r.status === 201, `POST /clients: ${r.status}`);
  const clientId = r.data.id;
  console.log(`• Client: ${clientId}`);

  // 1. Create an order with one inline item
  r = await api(jwt, 'POST', '/orders', {
    clientId,
    orderName: 'Wedding Suit',
    notes: 'Slim fit, navy blue',
    items: [
      {
        garmentType: 'suit',
        measurements: { chest: 96, waist: 80, shoulder: 42 },
        quantity: 1,
      },
    ],
  });
  assert(r.status === 201, `POST /orders: ${r.status}`);
  const orderId = r.data.id;
  assert(r.data.status === 'registered', `default status should be 'registered', got ${r.data.status}`);
  assert(r.data.clientId === clientId, 'clientId mismatch');
  console.log(`• Order created: ${orderId} (status=registered)`);

  // 2. GET /orders/:id includes items + events
  r = await api(jwt, 'GET', `/orders/${orderId}`);
  assert(r.status === 200, `GET /orders/:id: ${r.status}`);
  assert(Array.isArray(r.data.items) && r.data.items.length === 1, 'expected 1 item');
  assert(r.data.items[0].garmentType === 'suit', 'item type mismatch');
  assert(Array.isArray(r.data.events) && r.data.events.length >= 1, 'expected at least 1 event');
  assert(r.data.events.some((e: any) => e.eventType === 'created'), 'expected created event');
  console.log(`• Detail returned: ${r.data.items.length} item, ${r.data.events.length} event(s)`);

  // 3. List orders for the client
  r = await api(jwt, 'GET', `/orders?clientId=${clientId}`);
  assert(r.status === 200, `GET /orders: ${r.status}`);
  assert(r.data.items.some((o: any) => o.id === orderId), 'order missing from filtered list');
  console.log(`• List by clientId returned ${r.data.items.length} order(s)`);

  // 4. Patch fields (non-status)
  r = await api(jwt, 'PATCH', `/orders/${orderId}`, {
    notes: 'Slim fit, navy blue. Add silk lining.',
  });
  assert(r.status === 200, `PATCH /orders: ${r.status}`);
  assert(/silk lining/.test(r.data.notes), 'patch did not stick');
  console.log('• PATCH /orders ok');

  // 5. Transition: registered → in_progress
  r = await api(jwt, 'POST', `/orders/${orderId}/transition`, {
    to: 'in_progress',
    note: 'Started cutting',
  });
  assert(r.status === 201, `POST transition: ${r.status}`);
  assert(r.data.status === 'in_progress', 'status should be in_progress');
  console.log('• Transition: registered → in_progress ✓');

  // 6. Invalid transition: in_progress → delivered (must go through testing)
  r = await api(jwt, 'POST', `/orders/${orderId}/transition`, { to: 'delivered' });
  assert(r.status === 409, `invalid transition should 409, got ${r.status}`);
  console.log('• Invalid transition (in_progress → delivered) → 409 ✓');

  // 7. Valid: in_progress → testing → delivered
  r = await api(jwt, 'POST', `/orders/${orderId}/transition`, { to: 'testing' });
  assert(r.status === 201, `transition to testing: ${r.status}`);
  r = await api(jwt, 'POST', `/orders/${orderId}/transition`, { to: 'delivered' });
  assert(r.status === 201, `transition to delivered: ${r.status}`);
  assert(r.data.status === 'delivered', 'status should be delivered');
  console.log('• Transition: in_progress → testing → delivered ✓');

  // 8. Verify event timeline (4 status changes + 1 created = 5 events)
  r = await api(jwt, 'GET', `/orders/${orderId}`);
  const statusChangeEvents = r.data.events.filter(
    (e: any) => e.eventType === 'status_change',
  );
  assert(
    statusChangeEvents.length === 3,
    `expected 3 status_change events, got ${statusChangeEvents.length}`,
  );
  console.log(`• Event log: ${r.data.events.length} total (3 status changes + 1 created)`);

  // 9. Add another item via the dedicated endpoint
  r = await api(jwt, 'POST', `/orders/${orderId}/items`, {
    garmentType: 'vest',
    quantity: 1,
  });
  assert(r.status === 201, `POST /orders/:id/items: ${r.status}`);
  const itemId = r.data.id;
  console.log(`• Added item: ${itemId} (vest)`);

  // 10. List items
  r = await api(jwt, 'GET', `/orders/${orderId}/items`);
  assert(r.data.items.length === 2, `expected 2 items, got ${r.data.items.length}`);

  // 11. Patch item
  r = await api(jwt, 'PATCH', `/order-items/${itemId}`, { quantity: 2 });
  assert(r.status === 200, `PATCH /order-items: ${r.status}`);
  assert(r.data.quantity === 2, 'quantity update failed');
  console.log('• PATCH /order-items ok');

  // 12. Delete item
  r = await api(jwt, 'DELETE', `/order-items/${itemId}`);
  assert(r.status === 204, `DELETE /order-items: ${r.status}`);

  // 13. Cross-tenant probe
  r = await api(jwt, 'GET', '/orders/00000000-0000-0000-0000-000000000000');
  assert(r.status === 404, `cross-tenant probe: ${r.status}`);

  // 14. Validation: missing clientId
  r = await api(jwt, 'POST', '/orders', { orderName: 'Bad order' });
  assert(r.status === 400 || r.status === 422, `validation: ${r.status}`);
  console.log('• Validation rejects missing clientId');

  // Cleanup
  await api(jwt, 'DELETE', `/orders/${orderId}`);
  await api(jwt, 'DELETE', `/clients/${clientId}`);
  console.log('• Cleanup done');

  console.log('\nOrders smoke test passed.');
}

main().catch((err) => {
  console.error('✗ Smoke test failed:', err);
  process.exit(1);
});
