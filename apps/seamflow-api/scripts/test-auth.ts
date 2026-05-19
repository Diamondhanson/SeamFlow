/**
 * End-to-end auth smoke test.
 *
 * Run from apps/seamflow-api with the dev server already up on PORT:
 *   pnpm test:auth
 *
 * What it does:
 *   1. Creates (or finds) a test user via the Supabase admin API
 *   2. Signs in with email/password to get a fresh JWT
 *   3. Hits GET /me with the JWT — expects 200 + profile
 *   4. Hits GET /me with no token — expects 401
 *   5. Hits GET /health — expects 200 (proves @Public() opt-out works)
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = process.env.PORT ?? '3001';

const TEST_EMAIL = 'auth-test@seamflow.local';
const TEST_PASSWORD = 'change-me-only-used-in-tests-9f3a2c';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  assert(SUPABASE_URL, 'SUPABASE_URL not set in env');
  assert(SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY not set in env');
  assert(SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY not set in env');

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Ensure test user exists
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    perPage: 200,
  });
  assert(!listErr, `listUsers failed: ${listErr?.message}`);
  let userId: string | undefined = list.users.find(
    (u) => u.email === TEST_EMAIL,
  )?.id;

  if (userId) {
    console.log(`• Test user exists: ${userId}`);
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    assert(!createErr, `createUser failed: ${createErr?.message}`);
    userId = created.user.id;
    console.log(`• Created test user: ${userId}`);
  }

  // 2. Sign in to get JWT
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: session, error: signInErr } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert(!signInErr, `signInWithPassword failed: ${signInErr?.message}`);
  const jwt = session.session?.access_token;
  assert(jwt, 'no access_token returned');
  console.log(`• Got JWT (${jwt.length} chars)`);

  const base = `http://localhost:${PORT}`;

  // 3. GET /me with JWT → 200
  const meRes = await fetch(`${base}/me`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  assert(meRes.status === 200, `GET /me with JWT: expected 200, got ${meRes.status}`);
  const me = await meRes.json();
  console.log('• GET /me →', JSON.stringify(me, null, 2));
  assert(me.id === userId, `/me returned id ${me.id}, expected ${userId}`);
  assert(me.email === TEST_EMAIL, `/me returned email ${me.email}, expected ${TEST_EMAIL}`);
  assert(me.profile, '/me returned null profile — handle_new_auth_user trigger may not have fired');
  assert(me.role === 'tailor', `/me returned role ${me.role}, expected 'tailor' (default)`);
  console.log('• ✓ /me payload correct');

  // 4. GET /me without auth → 401
  const noAuthRes = await fetch(`${base}/me`);
  assert(
    noAuthRes.status === 401,
    `GET /me without auth: expected 401, got ${noAuthRes.status}`,
  );
  console.log('• ✓ /me without auth → 401');

  // 5. GET /health public
  const healthRes = await fetch(`${base}/health`);
  assert(
    healthRes.status === 200,
    `GET /health: expected 200, got ${healthRes.status}`,
  );
  console.log('• ✓ /health public → 200');

  console.log('\nAuth smoke test passed.');
}

main().catch((err) => {
  console.error('✗ Smoke test failed:', err);
  process.exit(1);
});
