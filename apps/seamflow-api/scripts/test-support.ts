/**
 * End-to-end test for Help & Support tickets (plan step 1).
 *
 * The rules worth guarding, because each would fail quietly:
 *   · a retried "Send" opens ONE ticket, not two (idempotent on clientId)
 *   · nobody can read, reply to, or even confirm the existence of someone
 *     else's ticket
 *   · a screenshot path under another user's folder is refused — otherwise the
 *     API would sign someone else's private file straight back to the caller
 *   · storage itself refuses an upload into another user's folder
 *   · a user can only link an order they actually have
 *   · replying to a resolved ticket reopens it
 *
 * Two throwaway accounts are created pre-confirmed and removed at the end.
 * Requires the dev server on PORT. Run with: pnpm test:support
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = process.env.PORT ?? '3001';
const PASSWORD = 'change-me-only-used-in-tests-9f3a2c';
const BUCKET = 'support-media';

// A 1×1 PNG — storage only needs real bytes, not a real screenshot.
const PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
);

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

async function main(): Promise<void> {
  assert(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY, 'Supabase env not set');
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const created: string[] = [];
  const makeUser = async (label: string) => {
    const email = `support-test-${label}-${Date.now()}@seamflow.local`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    assert(!error, `createUser: ${error?.message}`);
    created.push(data.user!.id);
    // Each user gets their own client, so storage calls run as THAT user.
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const s = await client.auth.signInWithPassword({ email, password: PASSWORD });
    assert(!s.error, `signIn: ${s.error?.message}`);
    const jwt = s.data.session!.access_token;
    // Provision the public.users row the way the apps do on first launch.
    const me = await api(jwt, 'GET', '/me');
    assert(me.status === 200, `/me: ${me.status}`);
    return { id: data.user!.id, jwt, client };
  };

  try {
    const alice = await makeUser('alice');
    const bob = await makeUser('bob');

    // ---- Validation -------------------------------------------------------
    let r = await api(alice.jwt, 'POST', '/support/tickets', {
      side: 'client',
      category: 'app_problem',
      body: 'short',
      clientId: cid(),
    });
    assert(r.status === 400, `too-short description should 400, got ${r.status}`);
    console.log('• A one-word ticket is refused');

    // ---- Open a ticket; a retry returns the same one -----------------------
    const key = cid();
    const input = {
      side: 'client',
      category: 'app_problem',
      body: 'The app closes when I open my orders.\nIt started yesterday after the update.',
      clientId: key,
    };
    r = await api(alice.jwt, 'POST', '/support/tickets', input);
    assert(r.status === 201, `create: ${r.status} ${JSON.stringify(r.data)}`);
    const ticket = r.data.ticket;
    assert(ticket.number >= 1000, `ticket number should start at 1000, got ${ticket.number}`);
    assert(ticket.status === 'open', `new ticket should be open, got ${ticket.status}`);
    assert(
      ticket.subject === 'The app closes when I open my orders.',
      `subject should be the first line, got "${ticket.subject}"`,
    );
    assert(r.data.messages.length === 1, 'the description should be the first message');
    console.log(`• Opened SF-${ticket.number}, titled by its first line`);

    r = await api(alice.jwt, 'POST', '/support/tickets', input);
    assert(r.data.ticket.id === ticket.id, 'a retried submit opened a second ticket');
    r = await api(alice.jwt, 'GET', '/support/tickets');
    assert(r.data.items.length === 1, `expected 1 ticket after retry, got ${r.data.items.length}`);
    console.log('• A retried "Send" returns the same ticket');

    // ---- Privacy ----------------------------------------------------------
    r = await api(bob.jwt, 'GET', `/support/tickets/${ticket.id}`);
    assert(r.status === 404, `someone else's ticket should 404, got ${r.status}`);
    r = await api(bob.jwt, 'POST', `/support/tickets/${ticket.id}/messages`, {
      body: 'let me in',
      clientId: cid(),
    });
    assert(r.status === 404, `replying to someone else's ticket should 404, got ${r.status}`);
    r = await api(bob.jwt, 'GET', '/support/tickets');
    assert(r.data.items.length === 0, 'another user\'s ticket leaked into a list');
    console.log("• Someone else's ticket is invisible and unanswerable");

    // ---- Screenshots ------------------------------------------------------
    const own = `${alice.id}/${cid()}.png`;
    const up = await alice.client.storage.from(BUCKET).upload(own, PNG, { contentType: 'image/png' });
    assert(!up.error, `upload into own folder failed: ${up.error?.message}`);
    const intrude = await bob.client.storage
      .from(BUCKET)
      .upload(`${alice.id}/${cid()}.png`, PNG, { contentType: 'image/png' });
    assert(!!intrude.error, "storage let one user write into another's folder");
    console.log("• Storage refuses uploads into another user's folder");

    r = await api(bob.jwt, 'POST', '/support/tickets', {
      side: 'tailor',
      category: 'other',
      body: 'Here is a screenshot that is not mine at all.',
      attachments: [{ storagePath: own }],
      clientId: cid(),
    });
    assert(r.status === 403, `borrowing another user's screenshot should 403, got ${r.status}`);
    console.log("• The API refuses to attach another user's screenshot");

    r = await api(alice.jwt, 'POST', `/support/tickets/${ticket.id}/messages`, {
      attachments: [{ storagePath: own }],
      clientId: cid(),
    });
    assert(r.status === 201, `photo reply: ${r.status} ${JSON.stringify(r.data)}`);
    assert(typeof r.data.attachments[0]?.url === 'string', 'screenshot came back without a signed URL');
    console.log('• A screenshot-only reply is accepted and signed for viewing');

    // ---- Orders -----------------------------------------------------------
    r = await api(alice.jwt, 'POST', '/support/tickets', {
      side: 'client',
      category: 'order',
      body: 'Asking about an order that is not mine.',
      orderId: crypto.randomUUID(),
      clientId: cid(),
    });
    assert(r.status === 400, `linking a stranger's order should 400, got ${r.status}`);
    console.log("• Only the user's own orders can be linked");

    // ---- Resolve, then reopen by replying ---------------------------------
    r = await api(alice.jwt, 'PATCH', `/support/tickets/${ticket.id}`, { status: 'resolved' });
    assert(r.status === 200 && r.data.status === 'resolved', `resolve: ${r.status} ${r.data?.status}`);
    r = await api(alice.jwt, 'PATCH', `/support/tickets/${ticket.id}`, { status: 'open' });
    assert(r.status === 400, `users should not set other statuses, got ${r.status}`);
    r = await api(alice.jwt, 'POST', `/support/tickets/${ticket.id}/messages`, {
      body: 'Sorry, it is happening again.',
      clientId: cid(),
    });
    assert(r.status === 201, `reply after resolve: ${r.status}`);
    r = await api(alice.jwt, 'GET', `/support/tickets/${ticket.id}`);
    assert(r.data.ticket.status === 'open', `a reply should reopen, got ${r.data.ticket.status}`);
    assert(r.data.messages.length === 3, `expected 3 messages, got ${r.data.messages.length}`);
    console.log('• Resolving works, and replying reopens the ticket');
  } finally {
    // ---- Cleanup: tickets, screenshots, rows, accounts ---------------------
    for (const id of created) {
      await admin.from('support_tickets').delete().eq('user_id', id);
      const { data } = await admin.storage.from(BUCKET).list(id);
      if (data?.length) await admin.storage.from(BUCKET).remove(data.map((f) => `${id}/${f.name}`));
      await admin.from('users').delete().eq('id', id);
      await admin.auth.admin.deleteUser(id);
    }
  }

  console.log('\nSupport ticket test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
