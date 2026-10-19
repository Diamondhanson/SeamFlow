/**
 * Voice notes, end to end.
 *
 * A voice note is the first attachment whose content neither side can read —
 * you either hear it or you have nothing. That makes the delivery path the
 * whole feature: a note that uploads but comes back without a playable URL is
 * indistinguishable, to the person who recorded it, from one that was never
 * sent.
 *
 * So what this asserts is mostly plumbing, deliberately:
 *
 *   · the bucket ACCEPTS audio — the 2026-10-17 lockdown narrowed it to
 *     images, and without the migration every recording fails at upload with
 *     a storage error the app cannot explain to anyone
 *   · a participant may write one, under the conversation's own prefix
 *   · it comes back to BOTH sides with a signed URL, and that URL really
 *     serves the bytes that were uploaded — not a 404 anyone would read as
 *     "the microphone is broken"
 *   · the duration and the waveform survive the round trip, because the bubble
 *     draws itself from them before the audio has loaded
 *   · the thread list and a quoted reply both say 🎤 — a marker, not a word,
 *     so each side reads it in its own language
 *   · the contract refuses a note with no length, a waveform taller than the
 *     scale, and a waveform longer than the agreed number of bars
 *   · a voice note can be reported, which is the only way to moderate
 *     something nobody can skim
 *
 * NOT covered here: the staff queue's audio player. Those routes require a
 * second factor, which a scripted user cannot obtain — but the queue signs the
 * path with the same call proven in step 4.
 *
 * Requires the dev server on PORT. Run with: pnpm test:voice-notes
 */
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const PORT = process.env.PORT ?? '3001';
const PASSWORD = 'change-me-only-used-in-tests-9f3a2c';
const CHAT_BUCKET = 'chat-media';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

/**
 * Something shaped like an .m4a. Storage checks the declared content type
 * rather than sniffing the bytes, so this does not need to decode — it needs
 * to be the right size and arrive back byte for byte.
 */
function fakeM4a(): Uint8Array {
  const header = [
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // size + 'ftyp'
    0x4d, 0x34, 0x41, 0x20, 0x00, 0x00, 0x00, 0x00, // 'M4A ' + minor version
    0x4d, 0x34, 0x41, 0x20, 0x6d, 0x70, 0x34, 0x32, // 'M4A ' 'mp42'
    0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x00, 0x00, // 'isom'
  ];
  const body = new Uint8Array(2048);
  for (let i = 0; i < body.length; i++) body[i] = (i * 31) % 251;
  const out = new Uint8Array(header.length + body.length);
  out.set(header, 0);
  out.set(body, header.length);
  return out;
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
  const uploaded: string[] = [];

  const makeUser = async (label: string, shop?: string) => {
    const email = `voice-${label}-${stamp}@seamflow.local`;
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
    return { userId, tailorId, jwt: s.data.session!.access_token, client: anon };
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
    const shop = await makeUser('shop', `Voice Test Shop ${stamp}`);
    const customer = await makeUser('customer');

    const { data: convo, error: ce } = await admin
      .from('conversations')
      .insert({ client_user_id: customer.userId, tailor_id: shop.tailorId })
      .select('id')
      .single();
    assert(!ce, `create conversation: ${ce?.message}`);
    const conversationId = convo!.id as string;

    // ---- 1. The bucket takes audio, from a participant --------------------
    const bytes = fakeM4a();
    const storagePath = `${conversationId}/voice-${stamp}.m4a`;
    const up = await customer.client.storage
      .from(CHAT_BUCKET)
      .upload(storagePath, bytes, { contentType: 'audio/mp4', upsert: false });
    assert(
      !up.error,
      `the bucket refused a voice note: ${up.error?.message} — has ` +
        '20261019120000_chat_voice_notes.sql been applied?',
    );
    uploaded.push(storagePath);
    console.log('• The chat bucket accepts audio, written by a participant');

    // ---- 2. Somebody else's conversation stays shut -----------------------
    const intruder = await customer.client.storage
      .from(CHAT_BUCKET)
      .upload(`00000000-0000-0000-0000-0000000000cc/sneak.m4a`, bytes, {
        contentType: 'audio/mp4',
      });
    assert(intruder.error, 'a voice note was written into a conversation the sender is not in');
    console.log('• Audio cannot be written into somebody else’s conversation');

    // ---- 3. Send it -------------------------------------------------------
    const waveform = Array.from({ length: 44 }, (_, i) => (i * 7) % 101);
    let r = await call(customer.jwt, 'POST', `/conversations/${conversationId}/messages`, {
      attachments: [
        { kind: 'voice', storagePath, durationMs: 8_400, waveform, contentType: 'audio/mp4' },
      ],
    });
    assert(r.status < 400, `send: ${r.status} ${JSON.stringify(r.body)}`);
    const sentId = r.body.id as string;
    console.log('• A voice note can be sent');

    // ---- 4. It comes back to both sides, playable -------------------------
    for (const [who, jwt] of [
      ['the sender', customer.jwt],
      ['the recipient', shop.jwt],
    ] as const) {
      const page = await call(jwt, 'GET', `/conversations/${conversationId}/messages`);
      assert(page.status === 200, `messages (${who}): ${page.status}`);
      const found = (page.body.items as { id: string; attachments: Record<string, unknown>[] }[])
        .find((m) => m.id === sentId);
      assert(found, `${who} cannot see the voice note at all`);
      const att = found.attachments[0] as {
        kind: string;
        url?: string;
        durationMs: number;
        waveform: number[];
      };
      assert(att.kind === 'voice', `${who} got a ${att.kind} instead of a voice note`);
      assert(att.url, `${who} got a voice note with no URL — there is nothing to play`);
      assert(att.durationMs === 8_400, `${who} lost the duration (${att.durationMs})`);
      assert(
        att.waveform.length === 44 && att.waveform[1] === 7,
        `${who} lost the waveform (${att.waveform.length} bars)`,
      );

      const fetched = await fetch(att.url);
      assert(fetched.ok, `${who}: the signed URL does not serve the file (${fetched.status})`);
      const got = new Uint8Array(await fetched.arrayBuffer());
      assert(
        got.byteLength === bytes.byteLength && got[0] === bytes[0] && got[40] === bytes[40],
        `${who}: the signed URL served something other than what was uploaded`,
      );
    }
    console.log('• Both sides get the note, the waveform, and a URL that really plays');

    // ---- 5. The markers ---------------------------------------------------
    const [convoRow] = await sql<{ preview: string }[]>`
      select last_message_preview as preview from conversations where id = ${conversationId}
    `;
    assert(
      convoRow?.preview === '🎤',
      `the thread list says "${convoRow?.preview}" instead of 🎤 for a voice note`,
    );

    r = await call(shop.jwt, 'POST', `/conversations/${conversationId}/messages`, {
      body: 'Got it, thank you',
      replyToId: sentId,
    });
    assert(r.status < 400, `reply: ${r.status}`);
    assert(
      r.body.replyPreview?.snippet === '🎤',
      `a quoted voice note reads "${r.body.replyPreview?.snippet}" instead of 🎤`,
    );
    console.log('• The thread list and a quoted reply both say 🎤');

    // ---- 6. The contract refuses nonsense ---------------------------------
    const bad = async (attachment: unknown, what: string) => {
      const res = await call(customer.jwt, 'POST', `/conversations/${conversationId}/messages`, {
        attachments: [attachment],
      });
      assert(res.status === 400, `${what} was accepted (got ${res.status})`);
    };
    await bad(
      { kind: 'voice', storagePath, durationMs: 0, waveform: [] },
      'a voice note with no length',
    );
    await bad(
      { kind: 'voice', storagePath, durationMs: 1_000, waveform: [5, 300] },
      'a waveform taller than the scale',
    );
    await bad(
      { kind: 'voice', storagePath, durationMs: 1_000, waveform: new Array(80).fill(10) },
      'a waveform with more bars than agreed',
    );
    console.log('• A malformed voice note is refused at the contract');

    // ---- 7. It can be reported --------------------------------------------
    r = await call(shop.jwt, 'POST', '/reports', {
      target: 'message',
      targetId: sentId,
      reason: 'harassment',
    });
    assert(r.status < 400, `report a voice note: ${r.status} ${JSON.stringify(r.body)}`);
    console.log('• A voice note can be reported like anything else');
  } finally {
    if (uploaded.length) await admin.storage.from(CHAT_BUCKET).remove(uploaded);
    for (const id of userIds) {
      await sql`delete from content_reports where reporter_user_id = ${id}`;
    }
    const convos = await sql<{ id: string }[]>`
      select c.id from conversations c
       join users u on u.id = c.client_user_id
       where u.email like ${`voice-%-${stamp}@seamflow.local`}
    `;
    for (const c of convos) {
      await sql`delete from content_reports where target_id in (
                  select id from messages where conversation_id = ${c.id})`;
      await sql`delete from messages where conversation_id = ${c.id}`;
      await sql`delete from conversations where id = ${c.id}`;
    }
    for (const id of userIds) {
      await sql`delete from users where id = ${id}`;
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
    await sql.end({ timeout: 5 });
  }

  console.log('\nVoice notes test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
