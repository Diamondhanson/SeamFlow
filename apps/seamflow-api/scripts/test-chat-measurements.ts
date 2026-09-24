/**
 * End-to-end test for a measurement a client sends turning into real work.
 *
 * A customer can share a measurement set into a thread. Until this, that card
 * was a dead end: the tailor read the numbers and retyped them. What has to
 * hold for it not to be:
 *   · saving files the numbers under one of the TAILOR'S clients, creating
 *     that record from the enquiry when they are new
 *   · the thread remembers who that was, so the second save needs no picker
 *   · the values saved are the ones on the MESSAGE, not the ones in the request
 *   · a save can be re-pointed at a different client, and the thread follows
 *   · replacing overwrites one set instead of adding another, and cannot reach
 *     another client's numbers
 *   · quoting a thread links it to the same client record
 *   · only the tailor can do any of it
 *
 * Throwaway accounts are created and removed. Requires the dev server on PORT.
 * Run with: pnpm test:chat-measurements
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
    const email = `chat-msr-test-${label}-${Date.now()}@seamflow.local`;
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

  try {
    const tailor = await makeUser('tailor');
    let r = await api(tailor.jwt, 'POST', '/me/tailor', {
      businessName: 'Measurement Test Studio',
      countryCode: 'NG',
      currency: 'NGN',
    });
    assert(r.status === 200 || r.status === 201, `POST /me/tailor: ${r.status}`);
    const tailorId = (await api(tailor.jwt, 'GET', '/me')).data?.tailor?.id;
    assert(tailorId, 'no tailor id');

    const customer = await makeUser('customer');
    // A name, so the client record created from the enquiry carries it.
    await admin.from('users').update({ full_name: 'Ada Okafor' }).eq('id', customer.id);

    r = await api(customer.jwt, 'POST', '/conversations', {
      tailorId,
      firstMessage: 'Hello, I would like a dress.',
      clientId: cid(),
    });
    assert(r.status === 201 || r.status === 200, `POST /conversations: ${r.status}`);
    const convoId = r.data.id;

    // ---- The share (client side, already shipped) ---------------------------
    const values = { waist: 78, bust: 92, sleeve: 58 };
    r = await api(customer.jwt, 'POST', `/conversations/${convoId}/messages`, {
      clientId: cid(),
      attachments: [{ kind: 'measurement', label: 'My usual', values, unitPreference: 'cm' }],
    });
    assert(r.status === 201 || r.status === 200, `share measurement: ${r.status}`);
    const measurementMsgId = r.data.id;

    const plainMsg = await api(customer.jwt, 'POST', `/conversations/${convoId}/messages`, {
      clientId: cid(),
      body: 'Those are from last year.',
    });

    // ---- Only the tailor may file it ----------------------------------------
    r = await api(customer.jwt, 'POST', `/conversations/${convoId}/measurement-set`, {
      messageId: measurementMsgId,
    });
    assert(r.status === 403, `the customer filed their own measurements: ${r.status}`);
    console.log('• Only the tailor can file a measurement');

    // ---- First save: creates the client from the enquiry ---------------------
    r = await api(tailor.jwt, 'POST', `/conversations/${convoId}/measurement-set`, {
      messageId: measurementMsgId,
      label: 'Sent in chat',
    });
    assert(r.status === 201 || r.status === 200, `save: ${r.status} ${JSON.stringify(r.data)}`);
    const clientId = r.data.clientId;
    const firstSetId = r.data.measurementSetId;
    assert(r.data.replaced === false, 'first save reported a replacement');
    assert(r.data.clientName === 'Ada Okafor', `client named ${r.data.clientName}`);

    r = await api(tailor.jwt, 'GET', `/measurement-sets/${firstSetId}`);
    assert(r.status === 200, `read back the set: ${r.status}`);
    assert(r.data.clientId === clientId, 'the set was filed under another client');
    assert(
      Number(r.data.values.waist) === 78 && Number(r.data.values.sleeve) === 58,
      `the saved numbers are not the ones sent: ${JSON.stringify(r.data.values)}`,
    );
    assert(r.data.unitPreference === 'cm', 'the unit did not survive');
    console.log('• First save creates the client and files the numbers that were sent');

    // ---- The thread remembers -----------------------------------------------
    r = await api(tailor.jwt, 'GET', `/conversations/${convoId}`);
    assert(r.status === 200, `GET conversation: ${r.status}`);
    assert(r.data.conversation.linkedClient?.id === clientId, 'the thread forgot the client');
    // The customer must never see the tailor's private book.
    r = await api(customer.jwt, 'GET', `/conversations/${convoId}`);
    assert(!r.data.conversation.linkedClient, 'the tailor’s client record leaked to the customer');
    console.log('• The thread remembers who this is, and only the tailor sees it');

    // ---- Second save needs no picker ----------------------------------------
    r = await api(tailor.jwt, 'POST', `/conversations/${convoId}/measurement-set`, {
      messageId: measurementMsgId,
    });
    assert(r.status === 201 || r.status === 200, `second save: ${r.status}`);
    assert(r.data.clientId === clientId, 'the second save went to a different client');
    const secondSetId = r.data.measurementSetId;
    assert(secondSetId !== firstSetId, 'the second save overwrote instead of adding');
    console.log('• A later save goes straight to the remembered client');

    // ---- Replace overwrites --------------------------------------------------
    r = await api(tailor.jwt, 'POST', `/conversations/${convoId}/measurement-set`, {
      messageId: measurementMsgId,
      replaceSetId: secondSetId,
      label: 'Updated',
    });
    assert(r.status === 201 || r.status === 200, `replace: ${r.status}`);
    assert(r.data.replaced === true && r.data.measurementSetId === secondSetId, 'replace added a set');
    r = await api(tailor.jwt, 'GET', `/clients/${clientId}/measurement-sets`);
    assert(r.data.items.length === 2, `expected 2 sets after a replace, got ${r.data.items.length}`);
    console.log('• Replacing overwrites one set instead of adding another');

    // ---- Re-pointing at a different client -----------------------------------
    r = await api(tailor.jwt, 'POST', '/clients', {
      fullName: 'Someone Else',
      phone: '+2348030000001',
      address: 'Lagos',
    });
    assert(r.status === 201 || r.status === 200, `create other client: ${r.status}`);
    const otherClientId = r.data.id;

    r = await api(tailor.jwt, 'POST', `/conversations/${convoId}/measurement-set`, {
      messageId: measurementMsgId,
      replaceSetId: firstSetId,
      clientId: otherClientId,
    });
    assert(r.status === 400, `a set was replaced across clients: ${r.status}`);

    r = await api(tailor.jwt, 'POST', `/conversations/${convoId}/measurement-set`, {
      messageId: measurementMsgId,
      clientId: otherClientId,
    });
    assert(r.status === 201 || r.status === 200, `re-point: ${r.status}`);
    assert(r.data.clientId === otherClientId, 're-pointing filed it under the old client');
    r = await api(tailor.jwt, 'GET', `/conversations/${convoId}`);
    assert(r.data.conversation.linkedClient?.id === otherClientId, 'the thread did not follow');
    console.log('• Filing under someone else moves the thread with it');

    // ---- Nonsense is refused --------------------------------------------------
    r = await api(tailor.jwt, 'POST', `/conversations/${convoId}/measurement-set`, {
      messageId: plainMsg.data.id,
    });
    assert(r.status === 400, `a message with no measurement was accepted: ${r.status}`);
    r = await api(tailor.jwt, 'POST', `/conversations/${convoId}/measurement-set`, {
      messageId: measurementMsgId,
      attachmentIndex: 4,
    });
    assert(r.status === 400, `an attachment that does not exist was accepted: ${r.status}`);
    console.log('• A message with no measurement is refused');

    // ---- The quote flow uses the same link ------------------------------------
    r = await api(tailor.jwt, 'POST', `/conversations/${convoId}/quote`, {
      orderName: 'Dress, Ada',
    });
    assert(r.status === 201 || r.status === 200, `quote: ${r.status}`);
    assert(
      r.data.clientId === otherClientId,
      'the quote created a second client instead of using the thread’s',
    );
    console.log('• Quoting the thread reuses the client it is already linked to');
  } finally {
    for (const id of created) {
      await admin.from('tailors').delete().eq('user_id', id);
      await admin.from('users').delete().eq('id', id);
      await admin.auth.admin.deleteUser(id);
    }
  }
  console.log('\nChat measurement test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
