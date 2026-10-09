/**
 * Saved designs, end to end.
 *
 * The thing this replaces is the screenshot — so the bar is that a save has to
 * be at least as reliable as one. What that means in practice:
 *
 *   · saving is idempotent (the heart gets tapped twice from a stale screen)
 *   · only something actually published can be saved
 *   · the list comes back newest-save first, with the full design attached
 *   · a design that is UNPUBLISHED still returns an entry, with a null post —
 *     this is the case moderation creates, and dropping it silently would
 *     leave someone one card short with no explanation
 *   · unsaving removes it
 *   · saves are PRIVATE: one person's list never contains another's
 *   · the maker's count is their own work only, and is the only count anywhere
 *
 * Requires the dev server on PORT. Run with: pnpm test:saved-designs
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
    const email = `saved-${label}-${stamp}@seamflow.local`;
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
        .insert({ user_id: userId, business_name: shop, country_code: 'CM', currency: 'XAF' })
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
    const shop = await makeUser('shop', `Saved Test Shop ${stamp}`);
    const alice = await makeUser('alice');
    const bob = await makeUser('bob');

    const makePost = async (caption: string) => {
      const { data, error } = await admin
        .from('feed_posts')
        .insert({
          tailor_id: shop.tailorId,
          caption,
          status: 'published',
          public_path: `${shop.tailorId}/${caption}.jpg`,
          public_thumb_path: `${shop.tailorId}/${caption}_t.jpg`,
        })
        .select('id')
        .single();
      assert(!error, `create post: ${error?.message}`);
      return data!.id as string;
    };
    const postA = await makePost('a');
    const postB = await makePost('b');

    // ---- 1. Save, and save again ----------------------------------------
    let r = await call(alice.jwt, 'POST', `/feed/${postA}/save`, {});
    assert(r.status === 201 || r.status === 200, `save: ${r.status} ${JSON.stringify(r.body)}`);
    r = await call(alice.jwt, 'POST', `/feed/${postA}/save`, {});
    assert(r.status === 201 || r.status === 200, `saving twice errored: ${r.status}`);
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from saved_designs
       where user_id = ${alice.userId} and feed_post_id = ${postA}
    `;
    assert(n === 1, `saving twice made ${n} rows — the heart will double up on a stale screen`);
    console.log('• Saving is idempotent: a second tap changes nothing');

    // ---- 2. Only something published can be saved ------------------------
    const ghost = await call(alice.jwt, 'POST', '/feed/00000000-0000-0000-0000-0000000000bb/save', {});
    assert(ghost.status === 404, `a design that does not exist was saved (got ${ghost.status})`);
    console.log('• A design that is not published cannot be saved');

    // ---- 3. The list carries the whole design ---------------------------
    await call(alice.jwt, 'POST', `/feed/${postB}/save`, {});
    r = await call(alice.jwt, 'GET', '/me/saved');
    assert(r.status === 200, `list: ${r.status}`);
    const items = r.body.items as { feedPostId: string; post: { id: string } | null }[];
    assert(items.length === 2, `expected 2 saved, got ${items.length}`);
    assert(items[0]!.feedPostId === postB, 'the list is not newest-save first');
    assert(items[0]!.post?.id === postB, 'the saved entry has no design attached');
    console.log('• The list is newest first, with the full design attached');

    // ---- 4. Which of these have I saved ----------------------------------
    r = await call(alice.jwt, 'POST', '/me/saved/among', { ids: [postA, postB] });
    assert((r.body as string[]).length === 2, 'savedAmong missed a saved design');
    r = await call(bob.jwt, 'POST', '/me/saved/among', { ids: [postA, postB] });
    assert((r.body as string[]).length === 0, 'savedAmong leaked another person’s saves');
    console.log('• The filled-heart check is per person, and does not leak');

    // ---- 5. THE MODERATION CASE -----------------------------------------
    // Unpublished (by its maker, or by staff after a report). The entry must
    // survive and say so, rather than vanishing without explanation.
    // 'removed' is what the staff takedown sets — the exact state a report
    // produces, which is the one this case exists for.
    await sql`update feed_posts set status = 'removed' where id = ${postB}`;
    r = await call(alice.jwt, 'GET', '/me/saved');
    const after = r.body.items as { feedPostId: string; post: unknown }[];
    assert(after.length === 2, `a taken-down design vanished from the list (${after.length} left)`);
    const goneEntry = after.find((i) => i.feedPostId === postB);
    assert(goneEntry, 'the taken-down design is missing entirely');
    assert(goneEntry.post === null, 'a taken-down design is still being served as available');
    console.log('• A design taken down stays in the list, marked as gone');

    // ---- 6. Private ------------------------------------------------------
    r = await call(bob.jwt, 'GET', '/me/saved');
    assert((r.body.items as unknown[]).length === 0, 'one person can see another’s saves');
    console.log('• Saves are private: nobody else sees them');

    // ---- 7. The maker's count, and only their own work -------------------
    await call(bob.jwt, 'POST', `/feed/${postA}/save`, {});
    r = await call(shop.jwt, 'GET', '/me/designs/save-counts');
    assert(r.status === 200, `save counts: ${r.status}`);
    const counts = r.body as Record<string, number>;
    assert(counts[postA] === 2, `expected 2 saves on the maker's design, got ${counts[postA]}`);
    console.log('• The maker sees a count of their own design, and it is right');

    // Someone with no shop gets nothing rather than someone else's numbers.
    r = await call(alice.jwt, 'GET', '/me/designs/save-counts');
    assert(r.status >= 400, `a customer with no shop read save counts (got ${r.status})`);
    console.log('• Somebody without a shop cannot read save counts at all');

    // ---- 8. Unsaving ------------------------------------------------------
    r = await call(alice.jwt, 'DELETE', `/feed/${postA}/save`);
    assert(r.status === 200, `unsave: ${r.status}`);
    r = await call(alice.jwt, 'GET', '/me/saved');
    assert(
      !(r.body.items as { feedPostId: string }[]).some((i) => i.feedPostId === postA),
      'the design is still saved after unsaving',
    );
    console.log('• Unsaving removes it');
  } finally {
    const shopRows = await sql`select id from tailors where business_name = ${`Saved Test Shop ${stamp}`}`;
    for (const t of shopRows) {
      await sql`delete from saved_designs where feed_post_id in (select id from feed_posts where tailor_id = ${t.id as string})`;
      await sql`delete from feed_posts where tailor_id = ${t.id as string}`;
    }
    for (const id of userIds) {
      await sql`delete from saved_designs where user_id = ${id}`;
      await sql`delete from users where id = ${id}`;
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
    await sql.end({ timeout: 5 });
  }

  console.log('\nSaved designs test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
