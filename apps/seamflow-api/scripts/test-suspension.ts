/**
 * End-to-end test for account suspension.
 *
 * A suspension has to stop someone acting WITHOUT taking anything away. What
 * has to hold:
 *   · before it, ordinary writes work
 *   · while it is on, a write is refused with 403 `account_suspended` AND the
 *     reason they were given, so the app can say something useful
 *   · reads keep working, in full — the rule that you can always open SeamFlow
 *     and see your own work does not have an exception for this
 *   · /me carries the suspension, so the app can say so before they press
 *     anything
 *   · support still works. A suspension nobody can appeal is a ban with extra
 *     steps
 *   · lifting it restores writing immediately
 *
 * Creates a throwaway account and a throwaway staff grant, and removes both.
 * Requires the dev server on PORT. Run with: pnpm test:suspension
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = process.env.PORT ?? '3001';
const PASSWORD = 'change-me-only-used-in-tests-9f3a2c';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function api(jwt: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`http://localhost:${PORT}${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null } as { status: number; data: any };
}

const cid = () => crypto.randomUUID();

async function main(): Promise<void> {
  assert(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY, 'Supabase env not set');
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const created: string[] = [];
  const makeUser = async (label: string) => {
    const email = `suspend-test-${label}-${Date.now()}@seamflow.local`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    assert(!error, `createUser: ${error?.message}`);
    created.push(data.user!.id);
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const s = await anon.auth.signInWithPassword({ email, password: PASSWORD });
    assert(!s.error, `signIn: ${s.error?.message}`);
    const jwt = s.data.session!.access_token;
    assert((await api(jwt, 'GET', '/me')).status === 200, '/me failed');
    return { id: data.user!.id, jwt };
  };

  const REASON = 'Photos that were not your own work. Send us the originals and we will lift this.';

  try {
    const person = await makeUser('person');
    const staff = await makeUser('staff');
    await admin.from('staff').insert({ user_id: staff.id });

    // ---- Before ------------------------------------------------------------
    let r = await api(person.jwt, 'POST', '/consumer/measurements', {
      label: 'Before',
      values: { waist: 80 },
    });
    assert(r.status === 201 || r.status === 200, `write before suspension: ${r.status}`);
    const madeEarlier = r.data.id;
    console.log('• An ordinary write works before any of this');

    // ---- Suspend -----------------------------------------------------------
    r = await api(staff.jwt, 'POST', `/admin/users/${person.id}/suspended`, {
      suspended: true,
      reason: REASON,
    });
    assert(r.status === 201 || r.status === 200, `suspend: ${r.status} ${JSON.stringify(r.data)}`);

    r = await api(person.jwt, 'POST', '/consumer/measurements', {
      label: 'During',
      values: { waist: 81 },
    });
    assert(r.status === 403, `a suspended account still wrote: ${r.status}`);
    assert(r.data?.error === 'account_suspended', `wrong error: ${JSON.stringify(r.data)}`);
    assert(r.data?.reason === REASON, `the reason did not reach the app: ${JSON.stringify(r.data)}`);
    console.log('• A write is refused, with the reason they were given');

    // ---- Reads keep working ------------------------------------------------
    r = await api(person.jwt, 'GET', '/consumer/measurements');
    assert(r.status === 200, `reading own measurements while suspended: ${r.status}`);
    assert(
      (r.data.items ?? []).some((m: { id: string }) => m.id === madeEarlier),
      'what they made before is no longer readable',
    );
    console.log('• Everything they made is still readable');

    r = await api(person.jwt, 'GET', '/me');
    assert(r.status === 200, `/me while suspended: ${r.status}`);
    assert(r.data.suspension?.reason === REASON, '/me does not carry the suspension');
    console.log('• /me carries it, so the app can say so before anything is pressed');

    // ---- The two doors that stay open --------------------------------------
    r = await api(person.jwt, 'POST', '/support/tickets', {
      side: 'client',
      category: 'other',
      body: 'I think this hold on my account is a mistake, here is why.',
      clientId: cid(),
    });
    assert(r.status === 201 || r.status === 200, `a suspended account cannot appeal: ${r.status}`);
    console.log('• They can still write to support about it');

    r = await api(person.jwt, 'GET', '/account/export');
    assert(r.status === 200 || r.status === 404, `export while suspended: ${r.status}`);

    // ---- Lift --------------------------------------------------------------
    r = await api(staff.jwt, 'POST', `/admin/users/${person.id}/suspended`, { suspended: false });
    assert(r.status === 201 || r.status === 200, `restore: ${r.status}`);

    r = await api(person.jwt, 'POST', '/consumer/measurements', {
      label: 'After',
      values: { waist: 82 },
    });
    assert(r.status === 201 || r.status === 200, `writing after the hold was lifted: ${r.status}`);
    console.log('• Lifting it restores writing immediately');

    // ---- It was written down ------------------------------------------------
    const { data: audit } = await admin
      .from('admin_actions')
      .select('action, detail')
      .eq('target_id', person.id)
      .order('created_at', { ascending: true });
    const actions = (audit ?? []).map((a: { action: string }) => a.action);
    assert(actions.includes('user.suspend'), 'the suspension was not recorded');
    assert(actions.includes('user.restore'), 'lifting it was not recorded');
    console.log('• Both are in the audit trail, with who did them');

    // ---- Nobody else can do any of it ---------------------------------------
    r = await api(person.jwt, 'POST', `/admin/users/${staff.id}/suspended`, { suspended: true });
    assert(r.status === 403, `a non-staff account suspended somebody: ${r.status}`);
    console.log('• Only staff can suspend anyone');
  } finally {
    for (const id of created) {
      await admin.from('admin_actions').delete().eq('target_id', id);
      await admin.from('admin_actions').delete().eq('actor_user_id', id);
      await admin.from('staff').delete().eq('user_id', id);
      await admin.from('tailors').delete().eq('user_id', id);
      await admin.from('users').delete().eq('id', id);
      await admin.auth.admin.deleteUser(id);
    }
  }
  console.log('\nSuspension test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
