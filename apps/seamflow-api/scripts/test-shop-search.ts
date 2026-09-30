/**
 * Finding a SHOP by name in Discover.
 *
 * Word of mouth is how tailors get clients in this market: someone is told "go
 * to LYZMA" and types it. The existing design search already matched business
 * names, but only as a FALLBACK — a word that matched the garment/colour/style
 * vocabulary became a "concept" and never reached any shop name. So a shop
 * called "Gold Threads" or "Kaftan Palace" was unfindable by its own name, and
 * because concepts are ANDed the shopper got a confident page of OTHER shops'
 * gold designs and concluded the one they were told about was not here.
 *
 * That is the case this test is really about, and it is why the shop lookup
 * ignores the vocabulary entirely and runs on the raw words:
 *
 *   · a shop whose name is plain words is found          (the easy case)
 *   · a shop whose name IS vocabulary is found too       (the broken one)
 *   · a shop with no published designs is still found    (the referral case)
 *   · a prefix finds it; a fragment does not             (no cove-RED)
 *   · verified shops sort first                          (near-identical names)
 *   · no query, or a deep page, returns no shops
 *
 * Requires the dev server on PORT. Run with: pnpm test:shop-search
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

async function main(): Promise<void> {
  assert(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY, 'Supabase env not set');
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userIds: string[] = [];
  const tailorIds: string[] = [];
  const postIds: string[] = [];
  let jwt = '';
  const stamp = Date.now();

  const makeShop = async (name: string, opts: { verified?: boolean; designs?: number } = {}) => {
    const email = `shopsearch-${stamp}-${Math.random().toString(36).slice(2, 7)}@seamflow.local`;
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
        business_name: name,
        country_code: 'CM',
        currency: 'XAF',
        city: 'Douala',
        is_verified: opts.verified ?? false,
      })
      .select('id')
      .single();
    assert(!te, `create tailor: ${te?.message}`);
    tailorIds.push(t!.id);

    for (let i = 0; i < (opts.designs ?? 0); i++) {
      const { data: p, error: pe } = await admin
        .from('feed_posts')
        .insert({
          tailor_id: t!.id,
          caption: `piece ${i}`,
          status: 'published',
          public_path: `${t!.id}/s${i}.jpg`,
          public_thumb_path: `${t!.id}/s${i}_thumb.jpg`,
        })
        .select('id')
        .single();
      assert(!pe, `create post: ${pe?.message}`);
      postIds.push(p!.id);
    }

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

  const search = async (q: string, cursor?: string) => {
    const qs = new URLSearchParams({ limit: '12' });
    if (q) qs.set('q', q);
    if (cursor) qs.set('cursor', cursor);
    const res = await fetch(`http://localhost:${PORT}/feed?${qs}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const text = await res.text();
    assert(res.ok, `GET /feed: ${res.status} ${text}`);
    return JSON.parse(text) as {
      items: { id: string }[];
      shops?: { id: string; businessName: string; designCount: number; isVerified: boolean }[];
      nextCursor: string | null;
    };
  };

  try {
    // A name made of plain words nobody's vocabulary contains.
    const plain = await makeShop(`Zzyra Couture ${stamp}`, { designs: 2 });
    // THE CASE THAT WAS BROKEN: every word is vocabulary. "gold" is a colour,
    // "kaftan" is a garment. Under the old behaviour both were swallowed as
    // concepts and the name was never consulted.
    const vocab = await makeShop(`Gold Kaftan ${stamp}`, { designs: 1 });
    // The referral case: recommended by hand, nothing posted yet.
    const empty = await makeShop(`Nkwen Atelier ${stamp}`, { designs: 0 });

    let r = await search(`Zzyra ${stamp}`);
    const plainHit = r.shops?.find((s) => s.id === plain);
    assert(plainHit, 'a plain-word shop name was not found');
    // Asserted explicitly because the zero case alone passes while the count is
    // broken: a correlated subquery that never correlates returns 0 for
    // everyone, and "0 designs" was exactly what the empty-shop case expected.
    assert(
      plainHit.designCount === 2,
      `design count is wrong: expected 2, got ${plainHit.designCount} — the correlated subquery is not correlating`,
    );
    console.log('• A shop with an ordinary name is found, and its design count is right');

    r = await search(`Gold Kaftan ${stamp}`);
    assert(
      r.shops?.some((s) => s.id === vocab),
      'a shop whose name IS vocabulary was not found — the lookup is being swallowed by the search vocabulary again',
    );
    console.log('• A shop called "Gold Kaftan" is found, though both words are vocabulary');

    r = await search(`Nkwen ${stamp}`);
    const hit = r.shops?.find((s) => s.id === empty);
    assert(hit, 'a shop with no designs was not found — the referral case is broken');
    assert(hit.designCount === 0, `expected 0 designs, got ${hit.designCount}`);
    console.log('• A shop with nothing published is still found: someone was told to look for it');

    // Prefix yes, fragment no.
    r = await search(`Zzy ${stamp}`);
    assert(r.shops?.some((s) => s.id === plain), 'a prefix did not find the shop');
    r = await search(`zyra ${stamp}`);
    assert(
      !r.shops?.some((s) => s.id === plain),
      'a mid-word fragment matched — this is the cove-RED bug in a new place',
    );
    console.log('• A prefix finds it; a fragment inside a word does not');

    // Two shops, near-identical names, one verified.
    const unver = await makeShop(`Kribi Style ${stamp}`, { designs: 5 });
    const ver = await makeShop(`Kribi Styles ${stamp}`, { designs: 1, verified: true });
    r = await search(`Kribi ${stamp}`);
    const ids = (r.shops ?? []).map((s) => s.id);
    assert(ids.includes(ver) && ids.includes(unver), 'both similarly-named shops should appear');
    assert(
      ids.indexOf(ver) < ids.indexOf(unver),
      'the verified shop did not sort first, which is the one defence against a lookalike name',
    );
    console.log('• Of two lookalike names, the verified shop sorts first');

    // Not a search → no shop row.
    r = await search('');
    assert(!r.shops || r.shops.length === 0, 'shops came back for an empty query');
    console.log('• Browsing without a search shows no shop row');

    // Deep in the grid → no shop row (they scrolled past it).
    const first = await search('dress');
    if (first.nextCursor) {
      const second = await search('dress', first.nextCursor);
      assert(!second.shops || second.shops.length === 0, 'shops repeated on a later page');
      console.log('• A later page does not repeat the shop row');
    }
  } finally {
    for (const id of postIds) await admin.from('feed_posts').delete().eq('id', id);
    for (const id of tailorIds) await admin.from('tailors').delete().eq('id', id);
    for (const id of userIds) {
      await admin.from('users').delete().eq('id', id);
      await admin.auth.admin.deleteUser(id);
    }
  }
  console.log('\nShop search test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
