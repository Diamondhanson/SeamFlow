/**
 * End-to-end test for chat delta sync (plan step 3).
 *
 * The device keeps a copy of each thread and asks only for what changed. What
 * has to hold for that copy to stay TRUE, not just fast:
 *   · the newest page hands back a `syncedAt` to sync from
 *   · a delta carries new messages
 *   · a delta carries CHANGED old messages too — a reaction added later must
 *     reach a phone that already has the message (messages.updated_at)
 *   · a delta is small: when nothing changed it is empty
 *   · hydrate re-sends chosen messages (fresh photo links)
 *   · nobody outside the conversation can sync or hydrate it
 *
 * Throwaway accounts (a tailor and two clients) are created and removed.
 * Requires the dev server on PORT. Run with: pnpm test:chat-sync
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = process.env.PORT ?? '3001';
const PASSWORD = 'change-me-only-used-in-tests-9f3a2c';

function assert(cond: unknown, msg: string): asserts cond {
  // Throws rather than exiting, so the `finally` still removes the test accounts.
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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  assert(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY, 'Supabase env not set');
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const created: string[] = [];
  const makeUser = async (label: string) => {
    const email = `chat-sync-test-${label}-${Date.now()}@seamflow.local`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    assert(!error, `createUser: ${error?.message}`);
    created.push(data.user!.id);
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const s = await client.auth.signInWithPassword({ email, password: PASSWORD });
    assert(!s.error, `signIn: ${s.error?.message}`);
    const jwt = s.data.session!.access_token;
    assert((await api(jwt, 'GET', '/me')).status === 200, '/me failed');
    return { id: data.user!.id, jwt };
  };

  try {
    const tailor = await makeUser('tailor');
    let r = await api(tailor.jwt, 'POST', '/me/tailor', {
      businessName: 'Sync Test Studio',
      countryCode: 'NG',
      currency: 'NGN',
    });
    assert(r.status === 200 || r.status === 201, `POST /me/tailor: ${r.status}`);
    r = await api(tailor.jwt, 'GET', '/me');
    const tailorId = r.data?.tailor?.id;
    assert(tailorId, 'no tailor id');

    const client = await makeUser('client');
    const outsider = await makeUser('outsider');

    r = await api(client.jwt, 'POST', '/conversations', {
      tailorId,
      firstMessage: 'Hello, can you make a kaftan?',
      clientId: cid(),
    });
    assert(r.status === 201 || r.status === 200, `create conversation: ${r.status} ${JSON.stringify(r.data)}`);
    const convoId = r.data.conversation?.id ?? r.data.id;
    assert(convoId, 'no conversation id');
    for (let i = 1; i <= 4; i++) {
      await api(client.jwt, 'POST', `/conversations/${convoId}/messages`, { body: `detail ${i}`, clientId: cid() });
    }

    // Let the setup messages age past the delta's 10-second safety overlap, so
    // "only what changed" is actually measurable below.
    await sleep(11_000);

    // ---- The newest page is a starting point ------------------------------
    r = await api(tailor.jwt, 'GET', `/conversations/${convoId}/messages`);
    assert(r.status === 200, `first page: ${r.status}`);
    assert(typeof r.data.syncedAt === 'string', 'the newest page carried no syncedAt');
    assert(r.data.items.length === 5, `expected 5 messages, got ${r.data.items.length}`);
    const firstSync: string = r.data.syncedAt;
    const oldest = r.data.items[r.data.items.length - 1];
    console.log('• The newest page returns a syncedAt to sync from');

    // ---- A delta carries the new message, and only that --------------------
    await api(tailor.jwt, 'POST', `/conversations/${convoId}/messages`, { body: 'Yes — what length?', clientId: cid() });
    r = await api(client.jwt, 'GET', `/conversations/${convoId}/messages?since=${encodeURIComponent(firstSync)}`);
    assert(r.status === 200, `delta: ${r.status}`);
    const bodies = (r.data.items as any[]).map((m) => m.body);
    assert(
      bodies.length === 1 && bodies[0] === 'Yes — what length?',
      `expected just the new message, got ${JSON.stringify(bodies)}`,
    );
    console.log('• A delta carries the new message and nothing else');

    // Once everything is older than the overlap, a sync followed by another
    // sync must find nothing new.
    await sleep(11_000);
    r = await api(client.jwt, 'GET', `/conversations/${convoId}/messages?since=${encodeURIComponent(firstSync)}`);
    const settled: string = r.data.syncedAt;
    r = await api(client.jwt, 'GET', `/conversations/${convoId}/messages?since=${encodeURIComponent(settled)}`);
    assert(r.data.items.length === 0, `nothing changed, yet the delta sent ${r.data.items.length} message(s)`);
    const secondSync: string = r.data.syncedAt;
    console.log('• When nothing changed, a delta is empty');

    // ---- A delta carries CHANGED old messages -----------------------------
    r = await api(tailor.jwt, 'POST', `/conversations/${convoId}/messages/${oldest.id}/reactions`, { emoji: '👍' });
    assert(r.status === 200 || r.status === 201, `react: ${r.status}`);
    r = await api(client.jwt, 'GET', `/conversations/${convoId}/messages?since=${encodeURIComponent(secondSync)}`);
    const changed = r.data.items.find((m: any) => m.id === oldest.id);
    assert(changed, 'a reaction on an old message did not reach the delta');
    assert(changed.reactions.some((x: any) => x.emoji === '👍'), 'the delta copy lacks the reaction');
    console.log('• A reaction on an old message arrives in the next delta');

    // ---- Hydrate ------------------------------------------------------------
    r = await api(client.jwt, 'POST', `/conversations/${convoId}/messages/hydrate`, { ids: [oldest.id] });
    assert(r.status === 201 || r.status === 200, `hydrate: ${r.status}`);
    assert(r.data.items.length === 1 && r.data.items[0].id === oldest.id, 'hydrate returned the wrong messages');
    console.log('• Hydrate re-sends exactly the messages asked for');

    // ---- Privacy ------------------------------------------------------------
    r = await api(outsider.jwt, 'GET', `/conversations/${convoId}/messages?since=${encodeURIComponent(firstSync)}`);
    assert(r.status === 403 || r.status === 404, `an outsider synced the thread: ${r.status}`);
    r = await api(outsider.jwt, 'POST', `/conversations/${convoId}/messages/hydrate`, { ids: [oldest.id] });
    assert(r.status === 403 || r.status === 404, `an outsider hydrated the thread: ${r.status}`);
    r = await api(client.jwt, 'GET', `/conversations/${convoId}/messages?since=not-a-date`);
    assert(r.status === 400, `a bad since should 400, got ${r.status}`);
    console.log('• Outsiders cannot sync or hydrate; a malformed since is refused');
  } finally {
    // Deleting the tailor cascades the conversation and its messages.
    for (const id of created) {
      await admin.from('tailors').delete().eq('user_id', id);
      await admin.from('users').delete().eq('id', id);
      await admin.auth.admin.deleteUser(id);
    }
  }
  console.log('\nChat sync test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
