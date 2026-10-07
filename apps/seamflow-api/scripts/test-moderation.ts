/**
 * Moderation, end to end: reporting content and blocking a person.
 *
 * These two exist because SeamFlow publishes photographs to a feed anyone can
 * read and lets strangers message each other. Google's user-generated content
 * policy asks for both, but the reason to test them is simpler: a report that
 * silently fails and a block that does not block are worse than neither,
 * because both are promises a person has already relied on.
 *
 * What this asserts:
 *
 *   · a design, a shop and a message can each be reported
 *   · reporting the same thing twice returns the first report, not a second
 *   · you cannot report your own work
 *   · a report about something that no longer exists is refused
 *   · a block stops messages in BOTH directions — the half nobody tests
 *   · the blocked person appears in the list with their shop id, which is what
 *     the app matches on to hide them from Discover
 *   · unblocking restores messaging
 *   · the staff queue sees the reports, with enough to judge them
 *
 * Requires the dev server on PORT. Run with: pnpm test:moderation
 */
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const PORT = process.env.PORT ?? '3001';
const PASSWORD = 'change-me-only-used-in-tests-9f3a2c';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  assert(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY, 'Supabase env not set');
  assert(DATABASE_URL, 'DATABASE_URL not set');

  const sql = postgres(DATABASE_URL, { max: 1 });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const stamp = Date.now();
  const userIds: string[] = [];

  const makeUser = async (label: string, shop?: string) => {
    const email = `mod-${label}-${stamp}@seamflow.local`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    assert(!error, `createUser: ${error?.message}`);
    const userId = data.user!.id;
    userIds.push(userId);
    await admin.from('users').upsert({ id: userId, email, full_name: label });

    let tailorId: string | null = null;
    if (shop) {
      const { data: t, error: te } = await admin
        .from('tailors')
        .insert({
          user_id: userId,
          business_name: shop,
          country_code: 'CM',
          currency: 'XAF',
          city: 'Douala',
        })
        .select('id')
        .single();
      assert(!te, `create tailor: ${te?.message}`);
      tailorId = t!.id as string;
    }

    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const s = await anon.auth.signInWithPassword({ email, password: PASSWORD });
    assert(!s.error, `signIn: ${s.error?.message}`);
    return { userId, tailorId, jwt: s.data.session!.access_token };
  };

  const call = async (jwt: string, method: string, path: string, body?: unknown) => {
    const res = await fetch(`http://localhost:${PORT}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${jwt}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };

  try {
    const shopkeeper = await makeUser('shop', `Moderation Test Shop ${stamp}`);
    const shopper = await makeUser('shopper');

    // A published design to report.
    const { data: post, error: pe } = await admin
      .from('feed_posts')
      .insert({
        tailor_id: shopkeeper.tailorId,
        caption: 'A piece to report',
        status: 'published',
        public_path: `${shopkeeper.tailorId}/mod.jpg`,
        public_thumb_path: `${shopkeeper.tailorId}/mod_thumb.jpg`,
      })
      .select('id')
      .single();
    assert(!pe, `create post: ${pe?.message}`);

    // A conversation with one message from the shop, for the message report
    // and for the block test to have something to be stopped.
    const { data: convo, error: ce } = await admin
      .from('conversations')
      .insert({ client_user_id: shopper.userId, tailor_id: shopkeeper.tailorId })
      .select('id')
      .single();
    assert(!ce, `create conversation: ${ce?.message}`);
    const { data: msg, error: me } = await admin
      .from('messages')
      .insert({
        conversation_id: convo!.id,
        sender_type: 'tailor',
        sender_user_id: shopkeeper.userId,
        body: 'Hello from the shop',
      })
      .select('id')
      .single();
    assert(!me, `create message: ${me?.message}`);

    // ---- 1. All three surfaces can be reported --------------------------
    for (const [target, id] of [
      ['design', post!.id],
      ['shop', shopkeeper.tailorId!],
      ['message', msg!.id],
    ] as const) {
      const r = await call(shopper.jwt, 'POST', '/reports', {
        target,
        targetId: id,
        reason: 'stolen_work',
        note: `test ${target}`,
      });
      assert(r.status === 201 || r.status === 200, `report ${target}: ${r.status} ${JSON.stringify(r.body)}`);
      assert(r.body?.id, `report ${target} returned no id`);
    }
    console.log('• A design, a shop and a message can each be reported');

    // ---- 2. Reporting twice does not fill the queue ---------------------
    const first = await call(shopper.jwt, 'POST', '/reports', {
      target: 'design',
      targetId: post!.id,
      reason: 'spam',
    });
    const rows = await sql`
      select count(*)::int as n from content_reports
       where reporter_user_id = ${shopper.userId} and target = 'design' and target_id = ${post!.id}
    `;
    assert(rows[0]!.n === 1, `a second report was filed (${rows[0]!.n} rows) — the queue will fill with duplicates`);
    assert(first.body?.id, 'the duplicate report returned no id');
    console.log('• Reporting the same thing twice returns the first report, not a second');

    // ---- 3. You cannot report yourself ----------------------------------
    const own = await call(shopkeeper.jwt, 'POST', '/reports', {
      target: 'design',
      targetId: post!.id,
      reason: 'other',
    });
    assert(own.status === 400, `a shop reported its own design (got ${own.status})`);
    console.log('• A shop cannot report its own work');

    // ---- 4. Nor something that is gone ----------------------------------
    const ghost = await call(shopper.jwt, 'POST', '/reports', {
      target: 'design',
      targetId: '00000000-0000-0000-0000-0000000000aa',
      reason: 'other',
    });
    assert(ghost.status === 404, `a report about nothing was accepted (got ${ghost.status})`);
    console.log('• A report about content that no longer exists is refused');

    // ---- 5. Blocking stops messages BOTH ways ---------------------------
    // Before: both can send.
    const beforeA = await call(shopper.jwt, 'POST', `/conversations/${convo!.id}/messages`, {
      body: 'before the block',
    });
    assert(beforeA.status < 400, `the shopper could not send before blocking: ${beforeA.status}`);

    const blocked = await call(shopper.jwt, 'POST', `/me/blocks/${shopkeeper.userId}`, {});
    assert(blocked.status === 201 || blocked.status === 200, `block failed: ${blocked.status}`);

    const afterA = await call(shopper.jwt, 'POST', `/conversations/${convo!.id}/messages`, {
      body: 'after the block, from the blocker',
    });
    assert(
      afterA.status === 403,
      `the BLOCKER could still send (got ${afterA.status}) — a block that only mutes the incoming half is not a block`,
    );

    const afterB = await call(shopkeeper.jwt, 'POST', `/conversations/${convo!.id}/messages`, {
      body: 'after the block, from the blocked',
    });
    assert(
      afterB.status === 403,
      `the BLOCKED person could still send (got ${afterB.status})`,
    );
    console.log('• A block stops messages in both directions, not just one');

    // ---- 6. The list carries the shop id Discover filters on ------------
    const list = await call(shopper.jwt, 'GET', '/me/blocks');
    assert(list.status === 200, `blocks list: ${list.status}`);
    const entry = (list.body as { userId: string; tailorId: string | null }[]).find(
      (b) => b.userId === shopkeeper.userId,
    );
    assert(entry, 'the blocked person is not in the list');
    assert(
      entry.tailorId === shopkeeper.tailorId,
      'the block carries no tailor id — the app cannot hide the shop from Discover without it',
    );
    console.log('• The blocked shop is listed with the id Discover filters on');

    // ---- 7. And it is reversible ----------------------------------------
    const un = await call(shopper.jwt, 'DELETE', `/me/blocks/${shopkeeper.userId}`);
    assert(un.status === 200, `unblock failed: ${un.status}`);
    const afterUn = await call(shopper.jwt, 'POST', `/conversations/${convo!.id}/messages`, {
      body: 'after unblocking',
    });
    assert(
      afterUn.status < 400,
      `messaging did not come back after unblocking (got ${afterUn.status}) — the block is a one-way door`,
    );
    console.log('• Unblocking restores messaging');

    // ---- 8. Staff can see enough to judge --------------------------------
    const queued = await sql`
      select target, reason, note from content_reports
       where status = 'open' and reporter_user_id = ${shopper.userId}
       order by created_at
    `;
    assert(queued.length >= 3, `expected the three reports in the queue, found ${queued.length}`);
    console.log('• The reports are in the queue, open, waiting on a person');
  } finally {
    // Reports reference the reporter with ON DELETE SET NULL, so they survive
    // the user going away — which is correct in production and litter here.
    for (const id of userIds) {
      await sql`delete from content_reports where reporter_user_id = ${id}`;
    }
    const names = `Moderation Test Shop ${stamp}`;
    const tailorRows = await sql`select id from tailors where business_name = ${names}`;
    for (const t of tailorRows) {
      await sql`delete from content_reports where target_id = ${t.id as string}`;
      const posts = await sql`select id from feed_posts where tailor_id = ${t.id as string}`;
      for (const p of posts) {
        await sql`delete from content_reports where target_id = ${p.id as string}`;
      }
    }
    for (const id of userIds) {
      await sql`delete from users where id = ${id}`;
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
    await sql.end({ timeout: 5 });
  }

  console.log('\nModeration test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
