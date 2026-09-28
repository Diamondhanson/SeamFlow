/**
 * Trust signals (appendix J phase 2).
 *
 * Two numbers, both computed from what actually happened and neither settable
 * by the tailor. The test exists mostly for the reply-time median, where a
 * naive implementation is wrong in a way nobody notices:
 *
 *   ONE TURN, ONE NUMBER. A client sends "hello", then "are you free?", then a
 *   photo — three messages, one question. Measuring each against the reply
 *   would count a single answer three times and flatter every tailor whose
 *   clients type in bursts. Only the FIRST message of a client's turn counts.
 *
 *   THE MEDIAN, NOT THE MEAN. One question asked at midnight and answered at
 *   nine would drag a mean into nonsense. This number is shown to a stranger
 *   deciding whether to trust someone.
 *
 * Also checked: a shop below the sample floor reports nothing rather than a
 * confident wrong figure, and a tailor cannot set either value on themselves.
 *
 * Requires the dev server on PORT. Run with: pnpm test:trust-signals
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

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

async function recompute(): Promise<void> {
  const res = await fetch(`http://localhost:${PORT}/health/run-trust-signals`, { method: 'POST' });
  if (!res.ok) throw new Error(`run-trust-signals: ${res.status} ${await res.text()}`);
}

async function main(): Promise<void> {
  assert(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY, 'Supabase env not set');
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userIds: string[] = [];
  const tailorIds: string[] = [];
  const conversationIds: string[] = [];

  const makeUser = async (label: string) => {
    const email = `trust-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@seamflow.local`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    assert(!error, `createUser: ${error?.message}`);
    userIds.push(data.user!.id);
    await admin.from('users').upsert({ id: data.user!.id, email });
    return data.user!.id;
  };

  const makeTailor = async (label: string) => {
    const userId = await makeUser(`t-${label}`);
    const { data, error } = await admin
      .from('tailors')
      .insert({
        user_id: userId,
        business_name: `Trust ${label}`,
        country_code: 'CM',
        currency: 'XAF',
      })
      .select('id')
      .single();
    assert(!error, `create tailor: ${error?.message}`);
    tailorIds.push(data!.id);
    return { userId, tailorId: data!.id as string };
  };

  /** A thread with an exact script of who spoke when. */
  const thread = async (
    tailorId: string,
    tailorUserId: string,
    turns: { who: 'client' | 'tailor'; minutesAgo: number }[],
  ) => {
    const clientUserId = await makeUser('c');
    const { data: conv, error } = await admin
      .from('conversations')
      .insert({ client_user_id: clientUserId, tailor_id: tailorId })
      .select('id')
      .single();
    assert(!error, `create conversation: ${error?.message}`);
    conversationIds.push(conv!.id);
    await admin.from('messages').insert(
      turns.map((t) => ({
        conversation_id: conv!.id,
        sender_type: t.who,
        sender_user_id: t.who === 'client' ? clientUserId : tailorUserId,
        body: `${t.who} at -${t.minutesAgo}m`,
        created_at: minutesAgo(t.minutesAgo),
      })),
    );
  };

  const read = async (tailorId: string) => {
    const { data } = await admin
      .from('tailors')
      .select('completed_orders, response_time_hours')
      .eq('id', tailorId)
      .single();
    return data as { completed_orders: number; response_time_hours: number | null };
  };

  try {
    // ---- A: bursts. Three turns, each opened by a run of client messages ----
    // If bursts were counted per message this shop would have 9 samples, and a
    // median of ~0 because most of the extra ones sit right next to the reply.
    const burst = await makeTailor('bursts');
    await thread(burst.tailorId, burst.userId, [
      { who: 'client', minutesAgo: 600 }, // turn opens
      { who: 'client', minutesAgo: 599 },
      { who: 'client', minutesAgo: 598 },
      { who: 'tailor', minutesAgo: 480 }, // answered 2h after the turn opened
      { who: 'client', minutesAgo: 400 },
      { who: 'client', minutesAgo: 399 },
      { who: 'tailor', minutesAgo: 280 }, // 2h
      { who: 'client', minutesAgo: 200 },
      { who: 'client', minutesAgo: 199 },
      { who: 'tailor', minutesAgo: 80 }, // 2h
    ]);

    // ---- B: one outlier. Mean would say ~3h, median says 1h ---------------
    const outlier = await makeTailor('outlier');
    await thread(outlier.tailorId, outlier.userId, [
      { who: 'client', minutesAgo: 1000 },
      { who: 'tailor', minutesAgo: 940 }, // 1h
      { who: 'client', minutesAgo: 900 },
      { who: 'tailor', minutesAgo: 840 }, // 1h
      { who: 'client', minutesAgo: 800 },
      { who: 'tailor', minutesAgo: 200 }, // 10h
    ]);

    // ---- C: below the floor. Two answered turns is an anecdote ------------
    const shy = await makeTailor('shy');
    await thread(shy.tailorId, shy.userId, [
      { who: 'client', minutesAgo: 500 },
      { who: 'tailor', minutesAgo: 440 },
      { who: 'client', minutesAgo: 400 },
      { who: 'tailor', minutesAgo: 340 },
    ]);

    // ---- D: never answered. No number at all, not a zero ------------------
    const silent = await makeTailor('silent');
    await thread(silent.tailorId, silent.userId, [
      { who: 'client', minutesAgo: 500 },
      { who: 'client', minutesAgo: 400 },
    ]);

    await recompute();

    const a = await read(burst.tailorId);
    assert(
      a.response_time_hours === 2,
      `bursts: expected 2h, got ${a.response_time_hours} — a client's run of messages was counted as several questions`,
    );
    console.log('• A burst of client messages counts as ONE question, not three');

    const b = await read(outlier.tailorId);
    assert(
      b.response_time_hours === 1,
      `outlier: expected the median 1h, got ${b.response_time_hours} — one slow reply moved the figure`,
    );
    console.log('• One slow reply does not move the figure: it is a median, not a mean');

    const c = await read(shy.tailorId);
    assert(
      c.response_time_hours === null,
      `below the floor: expected null, got ${c.response_time_hours}`,
    );
    console.log('• Under three answered questions, no figure is claimed at all');

    const d = await read(silent.tailorId);
    assert(d.response_time_hours === null, `never answered: got ${d.response_time_hours}`);
    console.log('• A shop that never replied reports nothing, not zero');

    // ---- Orders delivered --------------------------------------------------
    const seller = await makeTailor('orders');
    const { data: client, error: ce } = await admin
      .from('clients')
      .insert({ tailor_id: seller.tailorId, full_name: 'Order Counter', phone: '+237600000077' })
      .select('id')
      .single();
    assert(!ce, `create client: ${ce?.message}`);
    const { error: oe } = await admin.from('orders').insert([
      { tailor_id: seller.tailorId, client_id: client!.id, order_name: 'Done 1', status: 'delivered' },
      { tailor_id: seller.tailorId, client_id: client!.id, order_name: 'Done 2', status: 'delivered' },
      {
        tailor_id: seller.tailorId,
        client_id: client!.id,
        order_name: 'Still going',
        status: 'in_progress',
      },
    ]);
    assert(!oe, `create orders: ${oe?.message}`);
    await recompute();
    let s = await read(seller.tailorId);
    assert(s.completed_orders === 2, `delivered count: expected 2, got ${s.completed_orders}`);
    console.log('• Only delivered orders count; work in progress does not');

    // ---- It goes DOWN again ------------------------------------------------
    // A partial update would leave yesterday's number sitting there looking
    // current, which is the difference between a stale figure and a false one.
    await admin
      .from('orders')
      .update({ status: 'in_progress' })
      .eq('tailor_id', seller.tailorId)
      .eq('order_name', 'Done 2');
    await recompute();
    s = await read(seller.tailorId);
    assert(s.completed_orders === 1, `after reopening: expected 1, got ${s.completed_orders}`);
    console.log('• Reopening an order takes the number back down');

    // ---- The tailor cannot simply type these in ----------------------------
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: emailRow } = await admin.auth.admin.getUserById(seller.userId);
    const sign = await anon.auth.signInWithPassword({
      email: emailRow.user!.email!,
      password: PASSWORD,
    });
    assert(!sign.error, `signIn: ${sign.error?.message}`);
    const res = await fetch(`http://localhost:${PORT}/me/tailor`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sign.data.session!.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessName: 'Trust orders',
        countryCode: 'CM',
        currency: 'XAF',
        completedOrders: 999,
        responseTimeHours: 1,
      }),
    });
    assert(res.ok, `upsert tailor: ${res.status}`);
    s = await read(seller.tailorId);
    assert(
      s.completed_orders === 1,
      `a tailor set their own order count to ${s.completed_orders}`,
    );
    assert(
      s.response_time_hours === null,
      `a tailor set their own reply time to ${s.response_time_hours}`,
    );
    console.log('• A tailor cannot set either signal on themselves');
  } finally {
    for (const id of conversationIds) {
      await admin.from('messages').delete().eq('conversation_id', id);
      await admin.from('conversations').delete().eq('id', id);
    }
    for (const id of tailorIds) {
      await admin.from('orders').delete().eq('tailor_id', id);
      await admin.from('clients').delete().eq('tailor_id', id);
      await admin.from('tailors').delete().eq('id', id);
    }
    for (const id of userIds) {
      await admin.from('users').delete().eq('id', id);
      await admin.auth.admin.deleteUser(id);
    }
    // Leave the real shops' figures correct rather than as this test left them.
    await recompute();
  }
  console.log('\nTrust signals test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
