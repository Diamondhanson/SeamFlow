/**
 * Discover's ranking lift for verified shops (appendix J.5, phase 3).
 *
 * The lift is deliberately MODEST — a verified post sorts as if it were three
 * days newer, not as a separate tier — because J's one rule is that unverified
 * tailors are still found, still browsed and still messaged. A tier would bury
 * them forever. So this test checks the nudge in both directions:
 *
 *   · a verified post beats an unverified one posted a day earlier
 *   · a verified post does NOT beat an unverified one posted a week later,
 *     which is what "modest" means and what a tier would get wrong
 *
 * And the part that is easy to break without noticing: the feed paginates by
 * KEYSET, so the cursor has to carry the same value the ORDER BY used. If it
 * carries created_at while the sort uses the lifted time, pages silently repeat
 * or skip rows — so the test walks the whole feed one post at a time and checks
 * every id appears exactly once.
 *
 * Requires the dev server on PORT. Run with: pnpm test:discover-ranking
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

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

async function main(): Promise<void> {
  assert(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY, 'Supabase env not set');
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userIds: string[] = [];
  const tailorIds: string[] = [];
  const postIds: string[] = [];
  let jwt = '';

  const makeShop = async (label: string, verified: boolean) => {
    const email = `rank-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@seamflow.local`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    assert(!error, `createUser: ${error?.message}`);
    userIds.push(data.user!.id);
    await admin.from('users').upsert({ id: data.user!.id, email });
    const { data: t, error: te } = await admin
      .from('tailors')
      .insert({
        user_id: data.user!.id,
        business_name: `Rank ${label}`,
        country_code: 'CM',
        currency: 'XAF',
        is_verified: verified,
      })
      .select('id')
      .single();
    assert(!te, `create tailor: ${te?.message}`);
    tailorIds.push(t!.id);
    if (!jwt) {
      const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const s = await anon.auth.signInWithPassword({ email, password: PASSWORD });
      assert(!s.error, `signIn: ${s.error?.message}`);
      jwt = s.data.session!.access_token;
    }
    return t!.id as string;
  };

  const post = async (tailorId: string, caption: string, createdAt: string) => {
    const { data, error } = await admin
      .from('feed_posts')
      .insert({
        tailor_id: tailorId,
        caption,
        status: 'published',
        public_path: `${tailorId}/rank.jpg`,
        public_thumb_path: `${tailorId}/rank_thumb.jpg`,
        created_at: createdAt,
      })
      .select('id')
      .single();
    assert(!error, `create post: ${error?.message}`);
    postIds.push(data!.id);
    return data!.id as string;
  };

  const feed = async (cursor?: string, limit = 48) => {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (cursor) qs.set('cursor', cursor);
    const res = await fetch(`http://localhost:${PORT}/feed?${qs}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    // Read the body ONCE: a template literal inside assert() consumes it even
    // when the assertion passes, which fails the next read with "body unusable".
    const text = await res.text();
    assert(res.ok, `GET /feed: ${res.status} ${text}`);
    return JSON.parse(text) as { items: { id: string }[]; nextCursor: string | null };
  };

  try {
    const verified = await makeShop('verified', true);
    const plain = await makeShop('plain', false);

    // A: verified, one day older than B. The 3-day lift should carry it above.
    const a = await post(verified, 'Verified, posted 4 days ago', daysAgo(4));
    const b = await post(plain, 'Unverified, posted 3 days ago', daysAgo(3));
    // C: unverified but much newer than D. The lift must NOT overturn this.
    const c = await post(plain, 'Unverified, posted today', daysAgo(0));
    const d = await post(verified, 'Verified, posted 10 days ago', daysAgo(10));

    const page = await feed(undefined, 48);
    const order = page.items.map((i) => i.id);
    const at = (id: string) => order.indexOf(id);
    for (const [name, id] of [['a', a], ['b', b], ['c', c], ['d', d]] as const) {
      assert(at(id) >= 0, `post ${name} is missing from the feed entirely`);
    }

    assert(
      at(a) < at(b),
      'a verified post from 4 days ago did not outrank an unverified one from 3 days ago — the lift is not applied',
    );
    console.log('• A verified post outranks an unverified one posted a day later');

    assert(
      at(c) < at(d),
      'a verified post from 10 days ago outranked an unverified one from today — the lift is a tier, not a nudge',
    );
    console.log('• A fresh unverified post still beats a stale verified one: it is a nudge, not a tier');

    // ---- Pagination, the thing the cursor change could silently break ------
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 60; i++) {
      const p = await feed(cursor, 1);
      if (p.items.length === 0) break;
      for (const item of p.items) seen.push(item.id);
      if (!p.nextCursor) break;
      cursor = p.nextCursor;
    }
    const dupes = seen.filter((id, i) => seen.indexOf(id) !== i);
    assert(dupes.length === 0, `paging one at a time repeated ${dupes.length} post(s)`);
    for (const [name, id] of [['a', a], ['b', b], ['c', c], ['d', d]] as const) {
      assert(seen.includes(id), `post ${name} was SKIPPED while paging through the feed`);
    }
    console.log(`• Paging one post at a time saw ${seen.length} posts, none repeated, none skipped`);

    // The order must be the same whether read in one page or many — otherwise
    // the cursor and the sort key disagree in a way a big page size hides.
    const walked = seen.filter((id) => [a, b, c, d].includes(id));
    const oneShot = order.filter((id) => [a, b, c, d].includes(id));
    assert(
      walked.join(',') === oneShot.join(','),
      `paged order ${walked.join(',')} differs from single-page order ${oneShot.join(',')}`,
    );
    console.log('• Paged order matches single-page order: the cursor and the sort key agree');
  } finally {
    for (const id of postIds) await admin.from('feed_posts').delete().eq('id', id);
    for (const id of tailorIds) await admin.from('tailors').delete().eq('id', id);
    for (const id of userIds) {
      await admin.from('users').delete().eq('id', id);
      await admin.auth.admin.deleteUser(id);
    }
  }
  console.log('\nDiscover ranking test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
