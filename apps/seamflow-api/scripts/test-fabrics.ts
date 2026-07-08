/**
 * Fabric library smoke test. Signs in as the test tailor, exercises fabric
 * CRUD, then verifies the order + invoice + public-order integration:
 *   - create/list/get/update/delete a fabric
 *   - attach the fabric to an order with meters used
 *   - POST /orders/:id/invoice pre-fills a fabric line (cost × meters)
 *   - GET /public/orders/:token returns the fabric block
 *
 * Run: pnpm --filter seamflow-api exec tsx scripts/test-fabrics.ts
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PORT = process.env.PORT ?? '3001';
const BASE = `http://localhost:${PORT}`;
const TEST_EMAIL = 'auth-test@seamflow.local';
const TEST_PASSWORD = 'change-me-only-used-in-tests-9f3a2c';

let pass = 0;
let fail = 0;
function assert(cond: unknown, msg: string): asserts cond {
  if (cond) {
    pass++;
    console.log(`  ok  ${msg}`);
  } else {
    fail++;
    console.error(`FAIL  ${msg}`);
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY not set');
  }
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data: session, error } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`signIn failed: ${error.message}`);
  const jwt = session.session?.access_token;
  if (!jwt) throw new Error('no access token');

  const H = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };
  const api = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: H,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, json };
  };

  console.log('\n— Fabric CRUD —');
  const created = await api('POST', '/fabrics', {
    name: 'Italian Wool',
    supplier: 'Douala Textiles',
    color: 'Navy',
    composition: '100% wool',
    yardageMeters: '12.5',
    costPerMeter: '8000',
  });
  assert(created.status === 201 || created.status === 200, `create -> ${created.status}`);
  const fabricId = created.json?.id as string;
  assert(!!fabricId, 'create returned an id');
  assert(created.json?.name === 'Italian Wool', 'create echoes name');
  assert(created.json?.costPerMeter === '8000.00', 'cost stored as numeric string');
  assert('photoUrl' in created.json, 'response carries photoUrl field (null ok)');

  const list = await api('GET', '/fabrics');
  assert(list.status === 200, `list -> ${list.status}`);
  assert(
    Array.isArray(list.json?.items) && list.json.items.some((f: any) => f.id === fabricId),
    'list contains the new fabric',
  );

  const got = await api('GET', `/fabrics/${fabricId}`);
  assert(got.status === 200 && got.json?.id === fabricId, 'get by id');

  const upd = await api('PATCH', `/fabrics/${fabricId}`, { color: 'Charcoal' });
  assert(upd.status === 200 && upd.json?.color === 'Charcoal', 'update color');

  // Tenant isolation: a random uuid should 404.
  const missing = await api('GET', '/fabrics/00000000-0000-0000-0000-000000000000');
  assert(missing.status === 404, `unknown fabric -> ${missing.status} (404)`);

  console.log('\n— Order + invoice integration —');
  // Grab a client to hang an order on.
  const clients = await api('GET', '/clients?limit=1');
  const clientId = clients.json?.items?.[0]?.id as string;
  assert(!!clientId, 'have a client to attach an order to');

  const order = await api('POST', '/orders', {
    clientId,
    orderName: 'Fabric smoke order',
    fabricId,
    fabricYardageUsed: 3.5,
    items: [{ garmentType: 'Kaftan', quantity: 1 }],
  });
  assert(order.status === 201 || order.status === 200, `create order -> ${order.status}`);
  const orderId = order.json?.id as string;
  assert(order.json?.fabricId === fabricId, 'order persisted fabricId');
  assert(order.json?.fabricYardageUsed === '3.50', `order yardage stored (${order.json?.fabricYardageUsed})`);

  const inv = await api('POST', `/orders/${orderId}/invoice`);
  assert(inv.status === 201 || inv.status === 200, `create invoice -> ${inv.status}`);
  const fabricLine = (inv.json?.lineItems ?? []).find((l: any) => l.category === 'fabric');
  assert(!!fabricLine, 'invoice has a pre-filled fabric line');
  // 8000/m × 3.5m = 28000
  assert(fabricLine?.unitPrice === 28000, `fabric line unitPrice = 28000 (got ${fabricLine?.unitPrice})`);
  assert(
    typeof fabricLine?.description === 'string' && fabricLine.description.includes('Italian Wool'),
    'fabric line description names the fabric',
  );

  console.log('\n— Public order fabric block —');
  const link = await api('POST', `/orders/${orderId}/share-link`);
  const token = link.json?.token as string;
  assert(!!token, 'minted a share link');
  const pub = await fetch(`${BASE}/public/orders/${encodeURIComponent(token)}`);
  const pubJson: any = await pub.json();
  assert(pub.status === 200, `public order -> ${pub.status}`);
  assert(pubJson?.fabric?.name === 'Italian Wool', 'public payload carries the fabric block');
  assert('photoUrl' in (pubJson?.fabric ?? {}), 'public fabric has photoUrl field');

  console.log('\n— Cleanup —');
  const delOrder = await api('DELETE', `/orders/${orderId}`);
  assert(delOrder.status === 204 || delOrder.status === 200, `delete order -> ${delOrder.status}`);
  const del = await api('DELETE', `/fabrics/${fabricId}`);
  assert(del.status === 204 || del.status === 200, `delete fabric -> ${del.status}`);
  const gone = await api('GET', `/fabrics/${fabricId}`);
  assert(gone.status === 404, `deleted fabric -> ${gone.status} (404)`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
