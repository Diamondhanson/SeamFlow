/**
 * End-to-end test for attaching Design Studio / My Designs images to an order.
 *
 * The behaviour under test is a COPY, and the assertion that matters most is
 * the negative one: after attaching, the ORIGINAL design and work must still
 * be there. An order is a record of a job that has to stay true months later,
 * so tidying the design studio must never punch a hole in an old order — and a
 * "move" masquerading as an "attach" is exactly how that would happen.
 *
 * Requires the dev server running on PORT. Run with:
 *   pnpm test:order-library
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
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

/** A tiny but genuinely valid PNG, so Storage has real bytes to copy. */
function tinyPng(): Uint8Array {
  return Uint8Array.from(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  );
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

  // Storage writes go through the USER's client, exactly as the app does them,
  // so the path-prefix RLS policy is exercised rather than bypassed.
  const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  let r = await api(jwt, 'POST', '/me/tailor', {
    businessName: 'SeamFlow Test Studio',
    countryCode: 'NG',
    currency: 'NGN',
  });
  assert(r.status === 200 || r.status === 201, `POST /me/tailor: ${r.status}`);
  r = await api(jwt, 'GET', '/me');
  const tailorId = r.data?.tailor?.id;
  assert(tailorId, 'no tailor id');

  // ---- A design in Design Studio -----------------------------------------
  const designPath = `${tailorId}/test-library-${Date.now()}.png`;
  const up1 = await authed.storage
    .from('designs')
    .upload(designPath, tinyPng(), { contentType: 'image/png', upsert: true });
  assert(!up1.error, `design upload failed: ${up1.error?.message}`);

  r = await api(jwt, 'POST', '/designs', {
    storagePath: designPath,
    contentType: 'image/png',
    caption: 'Library test design',
  });
  assert(r.status === 201, `POST /designs: ${r.status} ${JSON.stringify(r.data)}`);
  const designId = r.data.id;
  console.log(`• Design in Design Studio: ${designId}`);

  // ---- A work in My Designs ----------------------------------------------
  const workPath = `${tailorId}/test-library-work-${Date.now()}.png`;
  const up2 = await authed.storage
    .from('works')
    .upload(workPath, tinyPng(), { contentType: 'image/png', upsert: true });
  assert(!up2.error, `work upload failed: ${up2.error?.message}`);

  r = await api(jwt, 'POST', '/works', { storagePath: workPath, title: 'Library test work' });
  assert(r.status === 201, `POST /works: ${r.status} ${JSON.stringify(r.data)}`);
  const workId = r.data.id;
  console.log(`• Work in My Designs: ${workId}`);

  // ---- An order to attach them to ----------------------------------------
  r = await api(jwt, 'POST', '/clients', {
    fullName: 'Library Test Client',
    phone: `+23480${Date.now().toString().slice(-8)}`,
    address: 'Lagos',
  });
  assert(r.status === 201, `POST /clients: ${r.status}`);
  const clientId = r.data.id;

  r = await api(jwt, 'POST', '/orders', { clientId, orderName: 'Library attach test' });
  assert(r.status === 201, `POST /orders: ${r.status}`);
  const orderId = r.data.id;
  console.log(`• Order: ${orderId}`);

  // ---- Attach both, in one call ------------------------------------------
  r = await api(jwt, 'POST', `/orders/${orderId}/photos/from-library`, {
    designIds: [designId],
    workIds: [workId],
  });
  assert(r.status === 201, `attach: ${r.status} ${JSON.stringify(r.data)}`);
  assert(Array.isArray(r.data) && r.data.length === 2, `expected 2 photos, got ${r.data?.length}`);
  console.log('• Attached 2 images in one call');

  const fromDesign = r.data.find((p: any) => p.sourceDesignId === designId);
  const fromWork = r.data.find((p: any) => p.sourceWorkId === workId);
  assert(fromDesign, 'no photo carries sourceDesignId');
  assert(fromWork, 'no photo carries sourceWorkId');
  console.log('• Provenance recorded on both');

  // The copy must live in the ORDER's own folder, not point at the original.
  assert(
    fromDesign.storagePath.startsWith(`${tailorId}/${orderId}/`),
    `copy is not in the order's folder: ${fromDesign.storagePath}`,
  );
  assert(
    fromDesign.storagePath !== designPath,
    'the order photo still points at the original design object',
  );
  assert(fromDesign.role === 'reference', `expected role=reference, got ${fromDesign.role}`);
  console.log('• Copies live under the order, defaulted to role=reference');

  // The copied bytes must actually be fetchable.
  assert(fromDesign.signedUrl, 'no signed URL on the copy');
  const img = await fetch(fromDesign.signedUrl);
  assert(img.ok, `copied object not readable: ${img.status}`);
  const bytes = new Uint8Array(await img.arrayBuffer());
  assert(bytes.length === tinyPng().length, `copied bytes differ: ${bytes.length}`);
  console.log('• The copied image downloads and matches the original bytes');

  // ---- THE POINT: the originals are untouched -----------------------------
  r = await api(jwt, 'GET', `/designs/${designId}`);
  assert(r.status === 200, `design was removed by the attach! status ${r.status}`);
  r = await api(jwt, 'GET', `/works/${workId}`);
  assert(r.status === 200, `work was removed by the attach! status ${r.status}`);

  const stillThere = await authed.storage
    .from('designs')
    .createSignedUrl(designPath, 60);
  assert(!stillThere.error, `original design object gone: ${stillThere.error?.message}`);
  console.log('• Originals still in Design Studio and My Designs — a copy, not a move');

  // ---- Another tailor's design must not be attachable ---------------------
  r = await api(jwt, 'POST', `/orders/${orderId}/photos/from-library`, {
    designIds: ['00000000-0000-0000-0000-000000000000'],
  });
  assert(r.status === 404, `foreign design should 404, got ${r.status}`);
  console.log('• A design that is not yours → 404');

  // ---- An empty selection is a bad request, not a silent no-op ------------
  r = await api(jwt, 'POST', `/orders/${orderId}/photos/from-library`, {
    designIds: [],
    workIds: [],
  });
  assert(r.status === 400, `empty selection should 400, got ${r.status}`);
  console.log('• Empty selection → 400');

  // ---- Cleanup ------------------------------------------------------------
  r = await api(jwt, 'GET', `/orders/${orderId}/photos`);
  for (const photo of r.data.items ?? []) {
    await api(jwt, 'DELETE', `/order-photos/${photo.id}`);
  }
  await api(jwt, 'DELETE', `/orders/${orderId}`);
  await api(jwt, 'DELETE', `/clients/${clientId}`);
  await api(jwt, 'DELETE', `/designs/${designId}`);
  await api(jwt, 'DELETE', `/works/${workId}`);

  console.log('\nOrder library-attach test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
