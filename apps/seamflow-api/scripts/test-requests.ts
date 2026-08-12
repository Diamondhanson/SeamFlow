/**
 * End-to-end test for the request board (ROADMAP appendix H).
 *
 * Covers the full arc — a client posts, a tailor answers, the client picks —
 * plus the rules that stop it becoming a spam board. The ones worth calling
 * out, because they are the ones that would quietly rot the feature:
 *
 *   · a tailor cannot answer twice
 *   · a tailor cannot see, or answer, a request they are not eligible for
 *   · accepting opens ONE conversation and declines everyone else
 *   · offers are optional-price — "open to discuss" must be a valid answer
 *
 * Requires the dev server on PORT. Run with: pnpm test:requests
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = process.env.PORT ?? '3001';

const TAILOR_EMAIL = 'auth-test@seamflow.local';
const TAILOR_PASSWORD = 'change-me-only-used-in-tests-9f3a2c';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
}

async function api(
  jwt: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: any }> {
  const res = await fetch(`http://localhost:${PORT}${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

async function main(): Promise<void> {
  assert(SUPABASE_URL, 'SUPABASE_URL not set');
  assert(SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY not set');

  assert(SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY not set');

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // The project requires email confirmation, so a plain signUp gives no
  // session. Test clients are created pre-confirmed with the service role and
  // then signed in through the normal path, so everything after this point
  // exercises exactly the same auth a real client would.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const createdUserIds: string[] = [];

  const makeClient = async (label: string): Promise<string> => {
    const email = `request-test-${label}-${Date.now()}@seamflow.local`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: TAILOR_PASSWORD,
      email_confirm: true,
    });
    assert(!error, `admin createUser failed: ${error?.message}`);
    createdUserIds.push(data.user!.id);
    const signIn = await anon.auth.signInWithPassword({ email, password: TAILOR_PASSWORD });
    assert(!signIn.error, `client signIn failed: ${signIn.error?.message}`);
    return signIn.data.session!.access_token;
  };

  // ---- Two people: a tailor, and a client who posts to them ---------------
  const signedIn = await anon.auth.signInWithPassword({
    email: TAILOR_EMAIL,
    password: TAILOR_PASSWORD,
  });
  assert(!signedIn.error, `tailor signIn failed: ${signedIn.error?.message}`);
  const tailorJwt = signedIn.data.session!.access_token;

  let r = await api(tailorJwt, 'POST', '/me/tailor', {
    businessName: 'SeamFlow Test Studio',
    countryCode: 'NG',
    currency: 'NGN',
  });
  assert(r.status === 200 || r.status === 201, `POST /me/tailor: ${r.status}`);
  r = await api(tailorJwt, 'GET', '/me');
  const tailorId = r.data?.tailor?.id;
  assert(tailorId, 'no tailor id');

  // Specialities drive ranking, so set one to exercise matched-first ordering.
  r = await api(tailorJwt, 'PATCH', '/me/tailor-profile', {
    specialties: ['kaftan', 'gown'],
    city: 'Lagos',
  });
  assert(r.status === 200, `PATCH tailor-profile: ${r.status}`);
  console.log('• Tailor ready (specialities: kaftan, gown · Lagos)');

  // A throwaway client account. Requests are posted by `users`, not tailors,
  // so this cannot be faked with the tailor's own token.
  const clientJwt = await makeClient('a');
  console.log('• Client account created');

  // ---- Post a request ----------------------------------------------------
  const brief = {
    title: 'Wedding kaftan',
    description: 'Cream kaftan with gold embroidery on the chest, for a wedding in March.',
    garmentType: 'kaftan',
    photos: [{ path: `test/${Date.now()}.png` }],
    budgetMin: 40000,
    budgetMax: 65000,
    currency: 'NGN',
    visibility: 'selected' as const,
    tailorIds: [tailorId],
  };
  r = await api(clientJwt, 'POST', '/requests', brief);
  assert(r.status === 201, `POST /requests: ${r.status} ${JSON.stringify(r.data)}`);
  const requestId = r.data.id;
  assert(r.data.status === 'open', `expected open, got ${r.data.status}`);
  assert(r.data.acceptingOffers === true, 'should be accepting offers');
  assert(r.data.expiresAt, 'no expiry set');
  console.log(`• Request posted: ${requestId}`);

  // Validation is not decorative — a brief with no photo cannot be answered.
  r = await api(clientJwt, 'POST', '/requests', { ...brief, photos: [] });
  assert(r.status === 400, `photo-less request should 400, got ${r.status}`);

  // The cooldown must bite on the very next post.
  r = await api(clientJwt, 'POST', '/requests', brief);
  assert(r.status === 400, `cooldown should 400, got ${r.status}`);
  assert(/minute/i.test(JSON.stringify(r.data)), 'cooldown message should mention minutes');
  console.log('• Validation + post cooldown enforced');

  // ---- The tailor sees it ------------------------------------------------
  r = await api(tailorJwt, 'GET', '/tailor/requests');
  assert(r.status === 200, `GET /tailor/requests: ${r.status}`);
  const mine = r.data.items.find((x: any) => x.id === requestId);
  assert(mine, 'the invited tailor cannot see the request');
  assert(
    mine.clientUserId === undefined,
    'the board leaked the poster’s user id to a browsing tailor',
  );
  console.log('• Tailor sees it; poster identity withheld');

  // ---- Offers ------------------------------------------------------------
  // "Open to discuss" — no price at all — must be a valid answer, or this
  // becomes a lowest-bid auction.
  r = await api(tailorJwt, 'POST', `/tailor/requests/${requestId}/offers`, {
    message: 'I make these often. Happy to talk through the embroidery and price.',
  });
  assert(r.status === 201, `priceless offer: ${r.status} ${JSON.stringify(r.data)}`);
  const offerId = r.data.id;
  assert(r.data.price === null, 'price should stay null for an open-to-discuss offer');
  assert(r.data.currency === 'NGN', 'currency should fall back to the tailor’s');
  console.log('• Offer sent with no price ("open to discuss")');

  // One per tailor per request.
  r = await api(tailorJwt, 'POST', `/tailor/requests/${requestId}/offers`, {
    message: 'Actually, let me try again with a different pitch entirely.',
  });
  assert(r.status === 400, `second offer should 400, got ${r.status}`);
  console.log('• A tailor cannot answer the same request twice');

  // The counter followed.
  r = await api(clientJwt, 'GET', `/requests/${requestId}`);
  assert(r.data.offersCount === 1, `expected offersCount 1, got ${r.data.offersCount}`);

  // ---- Accept ------------------------------------------------------------
  r = await api(clientJwt, 'GET', `/requests/${requestId}/offers`);
  assert(r.status === 200 && r.data.items.length === 1, 'client cannot see the offer');

  r = await api(clientJwt, 'POST', `/offers/${offerId}/accept`);
  assert(r.status === 201, `accept: ${r.status} ${JSON.stringify(r.data)}`);
  assert(r.data.conversationId, 'accepting did not open a conversation');
  assert(r.data.offer.status === 'accepted', `offer status ${r.data.offer.status}`);
  const conversationId = r.data.conversationId;
  console.log('• Accepted → conversation opened');

  // The request closes itself; nobody should answer a decided brief.
  r = await api(clientJwt, 'GET', `/requests/${requestId}`);
  assert(r.data.status === 'fulfilled', `expected fulfilled, got ${r.data.status}`);
  assert(r.data.acceptingOffers === false, 'a fulfilled request still accepts offers');

  // And the conversation is real — it shows up in the tailor's own inbox.
  r = await api(tailorJwt, 'GET', '/conversations');
  const thread = (r.data.items ?? []).find((c: any) => c.id === conversationId);
  assert(thread, 'the conversation is not in the tailor’s inbox');
  assert(thread.origin === 'request', `expected origin=request, got ${thread.origin}`);
  console.log('• The conversation is in the tailor’s inbox, marked as a request');

  // Accepting twice is a mistake, not an idempotent no-op.
  r = await api(clientJwt, 'POST', `/offers/${offerId}/accept`);
  assert(r.status === 400, `double accept should 400, got ${r.status}`);

  // ---- Eligibility -------------------------------------------------------
  // A second client posts to a town this tailor is not in. The tailor must
  // neither see it nor be able to answer it by guessing the id.
  const otherJwt = await makeClient('b');

  r = await api(otherJwt, 'POST', '/requests', {
    description: 'A simple school uniform set, navy, for two children.',
    garmentType: 'school_uniform',
    photos: [{ path: `test/${Date.now()}-b.png` }],
    visibility: 'location',
    locationScope: 'town',
    locationValue: 'Nowhere-Ville',
  });
  assert(r.status === 201, `location request: ${r.status} ${JSON.stringify(r.data)}`);
  const foreignId = r.data.id;

  r = await api(tailorJwt, 'GET', '/tailor/requests');
  assert(
    !r.data.items.some((x: any) => x.id === foreignId),
    'a request from another town appeared on the board',
  );
  r = await api(tailorJwt, 'GET', `/tailor/requests/${foreignId}`);
  assert(r.status === 404, `ineligible request should 404, got ${r.status}`);
  r = await api(tailorJwt, 'POST', `/tailor/requests/${foreignId}/offers`, {
    message: 'Trying to answer something I should not be able to see at all.',
  });
  assert(r.status === 404, `offering on an ineligible request should 404, got ${r.status}`);
  console.log('• Out-of-area requests are invisible AND unanswerable');

  // ---- Cleanup -----------------------------------------------------------
  await api(clientJwt, 'POST', `/requests/${requestId}/close`);
  await api(otherJwt, 'POST', `/requests/${foreignId}/close`);
  // Delete the throwaway accounts; requests and offers cascade with them.
  for (const id of createdUserIds) await admin.auth.admin.deleteUser(id);

  console.log('\nRequest board test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
