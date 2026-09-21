/**
 * End-to-end test for chat photo retention (plan step 4).
 *
 *   · a photo in a chat about an order delivered > 90 days ago loses its
 *     full-size file; the preview stays and the message points at it
 *   · the same, but with an open support ticket on the order → untouched
 *   · an order delivered recently → untouched
 *
 * Builds real orders and conversations with throwaway accounts, backdates the
 * delivery with the service role, runs the job via the dev-only hook, and
 * removes everything afterwards. Run with: pnpm test:media-retention
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = process.env.PORT ?? '3001';
const PASSWORD = 'change-me-only-used-in-tests-9f3a2c';
const BUCKET = 'chat-media';
const PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
);

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
async function api(jwt: string | null, method: string, path: string, body?: unknown) {
  const res = await fetch(`http://localhost:${PORT}${path}`, {
    method,
    headers: { ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}), 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null } as { status: number; data: any };
}
const cid = () => crypto.randomUUID();

async function main(): Promise<void> {
  assert(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY, 'Supabase env not set');
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const created: string[] = [];
  const files: string[] = [];
  const makeUser = async (label: string) => {
    const email = `retention-test-${label}-${Date.now()}@seamflow.local`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    assert(!error, `createUser: ${error?.message}`);
    created.push(data.user!.id);
    const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const s = await c.auth.signInWithPassword({ email, password: PASSWORD });
    const jwt = s.data.session!.access_token;
    await api(jwt, 'GET', '/me');
    return { id: data.user!.id, jwt };
  };

  try {
    const tailor = await makeUser('tailor');
    await api(tailor.jwt, 'POST', '/me/tailor', { businessName: 'Retention Test Studio', countryCode: 'NG', currency: 'NGN' });
    const tailorId = (await api(tailor.jwt, 'GET', '/me')).data.tailor.id;
    const customer = await makeUser('customer');
    let r = await api(tailor.jwt, 'POST', '/clients', { fullName: 'Retention Client', phone: '+2348030000009', address: '1 Test Way, Lagos' });
    assert(r.status === 201, `POST /clients: ${r.status}`);
    const clientRecordId = r.data.id;

    // One scenario = an order, a conversation linked to it, and a photo message.
    const scenario = async (label: string, deliveredDaysAgo: number) => {
      r = await api(tailor.jwt, 'POST', '/orders', {
        clientId: clientRecordId,
        orderName: `Retention ${label}`,
        items: [{ garmentType: 'kaftan', measurements: {}, quantity: 1 }],
      });
      assert(r.status === 201, `POST /orders: ${r.status} ${JSON.stringify(r.data)}`);
      const orderId = r.data.id;
      // A fresh conversation per scenario: one thread per (client, tailor) is
      // reused, so each scenario gets its own customer.
      const who = await makeUser(`c-${label}`);
      r = await api(who.jwt, 'POST', '/conversations', { tailorId, firstMessage: `about ${label}`, clientId: cid() });
      const convoId = r.data.conversation?.id ?? r.data.id;
      assert(convoId, `no conversation for ${label}`);
      await admin.from('conversations').update({ order_id: orderId }).eq('id', convoId);

      const full = `${convoId}/${cid()}.png`;
      const thumb = full.replace('.png', '_thumb.png');
      for (const p of [full, thumb]) {
        const up = await admin.storage.from(BUCKET).upload(p, PNG, { contentType: 'image/png' });
        assert(!up.error, `upload: ${up.error?.message}`);
        files.push(p);
      }
      r = await api(who.jwt, 'POST', `/conversations/${convoId}/messages`, {
        attachments: [{ kind: 'image', storagePath: full, thumbnailPath: thumb }],
        clientId: cid(),
      });
      assert(r.status === 201, `photo message: ${r.status} ${JSON.stringify(r.data)}`);
      const messageId = r.data.id;

      const deliveredAt = new Date(Date.now() - deliveredDaysAgo * 86_400_000).toISOString();
      // Backdate the delivery the way a real status change records it.
      const u1 = await admin.from('orders').update({ status: 'delivered' }).eq('id', orderId);
      const u2 = await admin.from('order_events').insert({
        order_id: orderId,
        event_type: 'status_change',
        from_status: 'registered',
        to_status: 'delivered',
        created_at: deliveredAt,
      });
      assert(!u1.error && !u2.error, `backdating: ${u1.error?.message ?? u2.error?.message}`);
      return { orderId, convoId, messageId, full, thumb, who };
    };

    const old = await scenario('old', 91);
    const disputed = await scenario('disputed', 91);
    const recent = await scenario('recent', 30);
    // Opened by the tailor, who owns the order (a customer can only link an
    // order they have claimed).
    r = await api(tailor.jwt, 'POST', '/support/tickets', {
      side: 'tailor',
      category: 'order',
      body: 'The fit is wrong, see the photo in our chat.',
      orderId: disputed.orderId,
      clientId: cid(),
    });
    assert(r.status === 201, `ticket: ${r.status} ${JSON.stringify(r.data)}`);

    r = await api(null, 'POST', '/health/run-media-retention');
    assert(r.status === 201 || r.status === 200, `run: ${r.status}`);

    const exists = async (p: string) => {
      const dir = p.slice(0, p.lastIndexOf('/'));
      const { data } = await admin.storage.from(BUCKET).list(dir);
      return !!data?.some((f) => `${dir}/${f.name}` === p);
    };
    const attachmentOf = async (id: string) =>
      ((await admin.from('messages').select('attachments').eq('id', id).single()).data!.attachments as any[])[0];

    assert(!(await exists(old.full)), 'the old order kept its full-size photo');
    assert(await exists(old.thumb), 'the old order lost its preview');
    const a = await attachmentOf(old.messageId);
    assert(a.storagePath === old.thumb && a.fullSizeRemovedAt, 'the message still points at the deleted original');
    console.log('• 91 days after delivery: original removed, preview kept, message repointed');

    assert(await exists(disputed.full), 'a photo under an open support ticket was deleted');
    console.log('• An open support ticket on the order protects its photos');

    assert(await exists(recent.full), 'a photo from a recent order was deleted');
    console.log('• An order delivered 30 days ago is untouched');

    r = await api(old.who.jwt, 'GET', `/conversations/${old.convoId}/messages`);
    const msg = r.data.items.find((m: any) => m.id === old.messageId);
    assert(typeof msg?.attachments[0]?.url === 'string', 'the repointed photo no longer displays');
    console.log('• The photo still displays in the chat, from the preview');

    r = await api(null, 'POST', '/health/run-media-retention');
    assert(r.data.removed === 0, `a second run removed ${r.data.removed} more — it should be idempotent`);
    console.log('• Running again changes nothing');
  } finally {
    if (files.length) await admin.storage.from(BUCKET).remove(files);
    for (const id of created) {
      await admin.from('support_tickets').delete().eq('user_id', id);
      await admin.from('tailors').delete().eq('user_id', id);
      await admin.from('users').delete().eq('id', id);
      await admin.auth.admin.deleteUser(id);
    }
  }
  console.log('\nMedia retention test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
