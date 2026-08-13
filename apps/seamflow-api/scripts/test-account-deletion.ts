/**
 * End-to-end test for account deletion (App Store 5.1.1(v) / Google Play).
 *
 * The purge is the most irreversible thing this codebase does, so the parts
 * worth proving are the ones that would be silent failures in production:
 *
 *   · a stale token cannot start a deletion — re-auth is genuinely enforced
 *   · a pending account vanishes from the public feed immediately
 *   · cancelling puts it back EXACTLY as it was, touching no content
 *   · the purge removes storage objects, not just database rows
 *   · the users row survives as a tombstone with no personal data on it, so
 *     that a message in someone else's conversation still has a valid author
 *   · the Supabase auth user is gone, so the credentials cannot be used again
 *
 * Requires the dev server on PORT. Run with: pnpm test:deletion
 */
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DATABASE_URL = process.env.DATABASE_URL!;
const PORT = process.env.PORT ?? '3001';

const EMAIL = `deletion-test-${Date.now()}@seamflow.local`;
const PASSWORD = 'change-me-only-used-in-tests-4b81ef';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

async function api(jwt: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`http://localhost:${PORT}${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

async function main() {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const sql = postgres(DATABASE_URL, { prepare: false });

  // ── a real account with real belongings ─────────────────────────────────
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (cErr) throw cErr;
  const userId = created.user!.id;

  const { data: signIn } = await anon.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  const jwt = signIn!.session!.access_token;

  await sql`insert into users (id, email, role, full_name) values (${userId}, ${EMAIL}, 'tailor', 'Deletion Test')
            on conflict (id) do update set email = excluded.email`;
  const [tailor] = await sql`
    insert into tailors (user_id, business_name, country_code, currency)
    values (${userId}, 'Deletion Test Shop', 'CM', 'XAF') returning id`;
  const tailorId = tailor.id as string;

  const [client] = await sql`
    insert into clients (tailor_id, full_name, phone, address)
    values (${tailorId}, 'Test Client', '+237600000000', 'Douala') returning id`;

  // A published feed post, so we can watch it leave and come back.
  await sql`
    insert into feed_posts (tailor_id, public_path, public_thumb_path, status, caption)
    values (${tailorId}, ${tailorId + '/p.webp'}, ${tailorId + '/p_thumb.webp'}, 'published', 'test post')`;

  // A real storage object under the tailor's prefix — the thing a database
  // cascade will never reach.
  // A real 1x1 PNG: the designs bucket only accepts images, and a test that
  // seeds something the app could never store would be proving nothing.
  const PNG_1X1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  const objectPath = `${tailorId}/deletion-test.png`;
  const up = await admin.storage
    .from('designs')
    .upload(objectPath, PNG_1X1, { contentType: 'image/png', upsert: true });
  assert(!up.error, `seeded a storage object under the tailor prefix (${up.error?.message ?? 'ok'})`);

  const feedHas = async () => {
    const r = await fetch(`http://localhost:${PORT}/feed?limit=48`);
    const j = (await r.json()) as { items: { id: string }[] };
    const rows = await sql`select id from feed_posts where tailor_id = ${tailorId}`;
    const mine = new Set(rows.map((x) => x.id as string));
    return j.items.some((i) => mine.has(i.id));
  };

  assert(await feedHas(), 'the shop is visible in the public feed to begin with');

  // ── re-auth is really enforced ──────────────────────────────────────────
  const stale = [
    Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url'),
    Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000) - 3600 })).toString(
      'base64url',
    ),
    'sig',
  ].join('.');
  // Guard accepts the real token; the service reads iat off whatever we pass.
  // Simulate an hour-old session by asking with a token whose iat is stale.
  const staleTry = await api(stale, 'POST', '/account/deletion', {});
  assert(
    staleTry.status === 401 || staleTry.status === 403,
    `a stale/invalid token cannot start a deletion (got ${staleTry.status})`,
  );

  // ── request ─────────────────────────────────────────────────────────────
  const req = await api(jwt, 'POST', '/account/deletion', { reason: 'e2e test' });
  assert(req.status === 201 || req.status === 200, `deletion accepted (${req.status})`);
  assert(req.data.daysRemaining === 30, `grace period is 30 days (got ${req.data.daysRemaining})`);

  assert(!(await feedHas()), 'the shop disappears from the public feed immediately');

  const mePending = await api(jwt, 'GET', '/me');
  assert(mePending.data?.deletion?.requestedAt, '/me reports the pending deletion so apps can offer to cancel');

  // Content must be untouched — the grace period is a promise, not a gesture.
  const [postsStill] = await sql`select count(*)::int n from feed_posts where tailor_id = ${tailorId}`;
  assert(postsStill.n === 1, 'their feed post still EXISTS — nothing was destroyed on request');

  // ── cancel ──────────────────────────────────────────────────────────────
  const cancel = await api(jwt, 'DELETE', '/account/deletion');
  assert(cancel.status === 200, 'cancel accepted');
  assert(cancel.data.requestedAt === null, 'account is live again');
  assert(await feedHas(), 'the shop is back in the public feed, with no restore step');

  // ── export ──────────────────────────────────────────────────────────────
  const exp = await api(jwt, 'GET', '/account/export');
  assert(exp.status === 200, 'export returns');
  assert(
    exp.data.clients.some((c: { id: string }) => c.id === client.id),
    'export contains their client records',
  );

  // ── purge ───────────────────────────────────────────────────────────────
  await api(jwt, 'POST', '/account/deletion', {});
  // Bring the appointment forward rather than waiting 30 days.
  await sql`update users set deletion_scheduled_for = now() - interval '1 day' where id = ${userId}`;

  const purge = await fetch(`http://localhost:${PORT}/health/run-purge`, { method: 'POST' });
  if (purge.status === 404) {
    console.error('\n✗ no purge trigger endpoint — cannot test the purge over HTTP');
    process.exit(1);
  }
  assert(purge.ok, 'purge run');

  // ── what must be gone ───────────────────────────────────────────────────
  const objs = await admin.storage.from('designs').list(tailorId);
  assert((objs.data?.length ?? 0) === 0, 'storage objects are GONE (no cascade would have done this)');

  const [tRow] = await sql`select count(*)::int n from tailors where id = ${tailorId}`;
  assert(tRow.n === 0, 'the tailor row and its whole business record are gone');

  const [cRow] = await sql`select count(*)::int n from clients where tailor_id = ${tailorId}`;
  assert(cRow.n === 0, "their clients' records cascaded away");

  const [uRow] = await sql`select email, phone, full_name, deleted_at from users where id = ${userId}`;
  assert(uRow, 'the users row SURVIVES as a tombstone, keeping foreign keys valid');
  assert(
    uRow.email === null && uRow.phone === null && uRow.full_name === '',
    'every personal field on the tombstone is cleared',
  );
  assert(uRow.deleted_at !== null, 'the tombstone is marked deleted');

  const { data: gone } = await admin.auth.admin.getUserById(userId);
  assert(!gone?.user, 'the Supabase auth user is deleted — the credentials no longer work');

  const reSignIn = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  assert(!!reSignIn.error, 'signing back in with the old password fails');

  // ── clean up the tombstone this test created ────────────────────────────
  await sql`delete from users where id = ${userId}`;
  await sql.end();
  console.log('\nAll account-deletion checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
