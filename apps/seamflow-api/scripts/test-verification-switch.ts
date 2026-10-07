/**
 * The verification switch — one lever on the dashboard that decides whether
 * anybody is ever invited to verify.
 *
 * Phone confirmation costs money per code. Until that is funded, an invitation
 * is a road that ends in a 403, so the whole surface stays hidden: the home
 * prompt, the two Settings rows, and the screens behind them. The app does not
 * decide this — it asks the server on every load, which is what lets the switch
 * reach an installed build with no update.
 *
 * What this asserts:
 *
 *   · OFF is the default, including when the row does not exist at all
 *   · both flags the app hides on go false  (phone `enabled`, state `available`)
 *   · the API REFUSES the flow while off, not merely hides it — an older build
 *     still has the screens, and must not be able to spend credit we lack
 *   · turning it on lifts both flags again
 *
 * The last one is what makes this worth running: a switch that hides correctly
 * but never comes back is a trap you would not find until the day you pay.
 *
 * Requires the dev server on PORT. Run with: pnpm test:verification-switch
 */
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const PORT = process.env.PORT ?? '3001';
const PASSWORD = 'change-me-only-used-in-tests-9f3a2c';
const KEY = 'verification_visible';

/** The settings cache in the API; a flip is not visible to it before this. */
const SETTINGS_CACHE_MS = 15_000;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  assert(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY, 'Supabase env not set');
  assert(DATABASE_URL, 'DATABASE_URL not set');

  const sql = postgres(DATABASE_URL, { max: 1 });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Whatever the platform is set to right now goes back at the end. This test
  // writes to a REAL settings row, so leaving it flipped would silently change
  // what every tailor sees.
  const [before] = await sql`select value from platform_settings where key = ${KEY}`;
  const original: unknown = before?.value ?? null;

  const stamp = Date.now();
  const email = `vswitch-${stamp}@seamflow.local`;
  let userId = '';
  let jwt = '';

  const setSwitch = async (value: boolean | null) => {
    if (value === null) {
      await sql`delete from platform_settings where key = ${KEY}`;
    } else {
      await sql`
        insert into platform_settings (key, value, updated_at)
        values (${KEY}, ${JSON.stringify(value)}::jsonb, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
      `;
    }
    // The API caches settings for a few seconds. Wait it out rather than
    // restarting: this is also a check that the cache does expire.
    await sleep(SETTINGS_CACHE_MS + 1_000);
  };

  const getJson = async (path: string) => {
    const res = await fetch(`http://localhost:${PORT}${path}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const text = await res.text();
    assert(res.ok, `GET ${path}: ${res.status} ${text}`);
    return JSON.parse(text) as Record<string, unknown>;
  };

  try {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    assert(!error, `createUser: ${error?.message}`);
    userId = data.user!.id;
    await admin.from('users').upsert({ id: userId, email });
    await admin.from('tailors').insert({
      user_id: userId,
      business_name: `Switch Test ${stamp}`,
      country_code: 'CM',
      currency: 'XAF',
    });

    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const s = await anon.auth.signInWithPassword({ email, password: PASSWORD });
    assert(!s.error, `signIn: ${s.error?.message}`);
    jwt = s.data.session!.access_token;

    // ---- 1. No row at all is the state a fresh platform ships in ----------
    await setSwitch(null);
    let phone = await getJson('/me/phone');
    let state = await getJson('/me/verification');
    assert(
      phone.enabled === false,
      'with no settings row the phone flow reported enabled — the default is not OFF',
    );
    assert(
      state.available === false,
      'with no settings row verification reported available — the default is not OFF',
    );
    console.log('• A platform that has never heard of the switch keeps it OFF');

    // ---- 2. Explicitly off ------------------------------------------------
    await setSwitch(false);
    phone = await getJson('/me/phone');
    state = await getJson('/me/verification');
    assert(phone.enabled === false, 'switch off but phone flow reported enabled');
    assert(state.available === false, 'switch off but verification reported available');
    console.log('• Switched off, both flags the app hides on are false');

    // ---- 3. Hidden is not the same as closed ------------------------------
    // The UI is gone, but an installed build still has the screens. The server
    // is the only place this can actually be refused.
    const started = await fetch(`http://localhost:${PORT}/me/phone/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+237600000000' }),
    });
    assert(
      started.status === 503,
      `an older build could still start a phone code while the switch was off (got ${started.status})`,
    );
    const submitted = await fetch(`http://localhost:${PORT}/me/verification`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      // Schema-valid on purpose. An empty array is rejected by validation
      // before it ever reaches the service, which would have let this test
      // pass on a 400 without the guard existing at all.
      body: JSON.stringify({
        evidence: [
          {
            kind: 'work_photo',
            storagePath: `${userId}/switch-test.jpg`,
            capturedAt: new Date().toISOString(),
          },
        ],
      }),
    });
    assert(
      submitted.status === 503,
      `an older build could still submit a request while the switch was off (got ${submitted.status})`,
    );
    console.log('• The server refuses the flow outright, it does not only hide it');

    // ---- 4. And it comes back --------------------------------------------
    await setSwitch(true);
    phone = await getJson('/me/phone');
    state = await getJson('/me/verification');
    // Only meaningful where a provider is configured; on a server without one
    // the flags stay false for the OTHER reason, which is also correct.
    if (process.env.DIDIT_API_KEY || process.env.OTP_PROVIDER) {
      assert(phone.enabled === true, 'switched on but the phone flow stayed hidden');
      assert(state.available === true, 'switched on but verification stayed hidden');
      console.log('• Switched on, both flags come back — the lever is not one-way');
    } else {
      assert(
        phone.enabled === false && state.available === false,
        'no OTP provider configured, yet the flags went true',
      );
      console.log('• Switched on with no provider configured: still hidden, for the other reason');
    }
  } finally {
    // Put the platform back exactly as it was, then clean up the test account.
    if (original === null) {
      await sql`delete from platform_settings where key = ${KEY}`;
    } else {
      await sql`
        insert into platform_settings (key, value, updated_at)
        values (${KEY}, ${JSON.stringify(original)}::jsonb, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
      `;
    }
    if (userId) {
      await sql`delete from tailors where user_id = ${userId}`;
      await sql`delete from users where id = ${userId}`;
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
    await sql.end({ timeout: 5 });
  }

  console.log('\nVerification switch test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
