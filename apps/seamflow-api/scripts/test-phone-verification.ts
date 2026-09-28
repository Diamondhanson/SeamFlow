/**
 * Tests for phone verification, in two halves.
 *
 * PART A — the Didit adapter, against a local stub of their API. No API key, no
 * credit balance and no network. This is where the new risk lives: a vendor that
 * owns the OTP lifecycle means our correctness is mostly about reading their
 * answers properly, and every one of their documented responses is exercised
 * here:
 *
 *   · the request itself: URL, x-api-key header, WhatsApp as preferred channel
 *   · Success / Retry / Blocked on send
 *   · Approved / Failed / Declined / "Expired or Not Found" on check
 *   · 400 / 403 / 429 / 502 mapped to the right blame, because an empty prepaid
 *     balance must NEVER be reported to a user as an invalid phone number
 *   · the carrier and duplicate signals appendix J's review queue reads
 *
 * PART B — the live endpoints, with OTP_PROVIDER=console. Skipped when the dev
 * server is not running, because it is the half that needs one.
 *
 * Run with: pnpm test:phone (which builds first)
 */
import { createServer, type Server } from 'node:http';
import { createClient } from '@supabase/supabase-js';
// From dist, not src: the adapters are ordinary CommonJS modules once compiled,
// and `nest build` runs first (see the test:phone script). Importing the .ts
// directly would need every intra-src import to carry an extension, which the
// Nest build does not want.
import { DiditOtpProvider } from '../dist/phone-verification/didit-otp-provider.js';
import { OtpDeliveryError } from '../dist/phone-verification/otp-provider.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = process.env.PORT ?? '3001';
const PASSWORD = 'change-me-only-used-in-tests-9f3a2c';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

/** What the stub was asked, so the test can check we send what they document. */
interface Seen {
  path: string;
  apiKey: string | undefined;
  body: Record<string, any>;
}

/**
 * A stand-in for verification.didit.me.
 *
 * `reply` decides the status and payload per call, so one stub covers every
 * branch without ten servers.
 */
async function withStub(
  reply: (seen: Seen, n: number) => { status: number; body: unknown },
  run: (baseUrl: string, seen: Seen[]) => Promise<void>,
): Promise<void> {
  const seen: Seen[] = [];
  let n = 0;
  const server: Server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const record: Seen = {
        path: req.url ?? '',
        apiKey: req.headers['x-api-key'] as string | undefined,
        body: raw ? JSON.parse(raw) : {},
      };
      seen.push(record);
      const { status, body } = reply(record, n++);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  try {
    await run(`http://127.0.0.1:${port}`, seen);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

/** Run something that should throw an OtpDeliveryError, and return it. */
async function blameOf(fn: () => Promise<unknown>): Promise<OtpDeliveryError> {
  try {
    await fn();
  } catch (err) {
    assert(err instanceof OtpDeliveryError, `wrong error type: ${String(err)}`);
    return err;
  }
  throw new Error('expected a failure, got a success');
}

const KEY = 'test-key-not-a-real-one';

async function partA(): Promise<void> {
  console.log('\nPart A — the Didit adapter, against a stub\n');

  // ---- The request we actually send ----------------------------------------
  await withStub(
    () => ({ status: 200, body: { request_id: 'req-1', status: 'Success' } }),
    async (baseUrl, seen) => {
      const p = new DiditOtpProvider({ apiKey: KEY, baseUrl });
      const r = await p.start({
        toE164: '+237671234567',
        channel: 'whatsapp',
        locale: 'fr',
        vendorData: 'user-abc',
        signals: { devicePlatform: 'android' },
      });
      assert(r.providerRef === 'req-1', 'the session id was not kept');
      const [call] = seen;
      assert(call.path === '/v3/phone/send/', `wrong path: ${call.path}`);
      assert(call.apiKey === KEY, 'the API key was not sent as x-api-key');
      assert(call.body.phone_number === '+237671234567', 'the number was mangled');
      assert(
        call.body.options?.preferred_channel === 'whatsapp',
        'WhatsApp was not the preferred channel',
      );
      assert(call.body.options?.locale === 'fr', 'the locale was not passed');
      assert(call.body.vendor_data === 'user-abc', 'vendor_data was not passed');
      assert(call.body.signals?.device_platform === 'android', 'the platform signal was lost');
      // The one thing that must NOT be there.
      assert(call.body.signals?.ip === undefined, 'an IP address was sent to the vendor');
    },
  );
  console.log('• Sends what they document: right path, x-api-key, WhatsApp first, no IP');

  // ---- Their three send statuses -------------------------------------------
  await withStub(
    () => ({ status: 200, body: { request_id: 'req-2', status: 'Retry' } }),
    async (baseUrl) => {
      const p = new DiditOtpProvider({ apiKey: KEY, baseUrl });
      const r = await p.start({ toE164: '+237671234567', channel: 'whatsapp', locale: 'en' });
      assert(r.providerRef === 'req-2', 'a free retry was treated as a failure');
    },
  );
  console.log('• "Retry" is a success: a message is still on its way, and it is not billed');

  await withStub(
    () => ({ status: 200, body: { status: 'Blocked', reason: 'repeated_attempts' } }),
    async (baseUrl) => {
      const p = new DiditOtpProvider({ apiKey: KEY, baseUrl });
      const err = await blameOf(() =>
        p.start({ toE164: '+237671234567', channel: 'whatsapp', locale: 'en' }),
      );
      assert(err.blame === 'caller', `a blocked number blamed ${err.blame}`);
      assert(err.message.includes('repeated_attempts'), 'the reason was dropped');
    },
  );
  console.log('• "Blocked" blames the caller and keeps their reason');

  // ---- The check outcomes ---------------------------------------------------
  await withStub(
    () => ({
      status: 200,
      body: {
        status: 'Approved',
        message: 'ok',
        phone: {
          carrier: { name: 'MTN Cameroon', type: 'mobile' },
          is_virtual: false,
          is_disposable: false,
          verification_method: 'whatsapp',
          warnings: [{ feature: 'PHONE_PORTED' }],
          matches: [{ id: 'other-1' }, { id: 'other-2' }],
        },
      },
    }),
    async (baseUrl, seen) => {
      const p = new DiditOtpProvider({ apiKey: KEY, baseUrl });
      const r = await p.check({ toE164: '+237671234567', code: '123456' });
      assert(r.outcome === 'approved', `approved read as ${r.outcome}`);
      assert(r.risk?.carrier === 'MTN Cameroon', 'the carrier was lost');
      assert(r.risk?.lineType === 'mobile', 'the line type was lost');
      assert(r.risk?.deliveredChannel === 'whatsapp', 'the delivering channel was lost');
      assert(r.risk?.duplicateMatches === 2, 'duplicate accounts on this number were not counted');
      assert(r.risk?.warnings.includes('PHONE_PORTED'), 'warnings were dropped');
      // Appendix J's one rule, enforced at the wire: we never ask them to
      // decline anybody for us.
      const [call] = seen;
      assert(call.path === '/v3/phone/check/', `wrong path: ${call.path}`);
      assert(call.body.voip_number_action === 'NO_ACTION', 'we asked them to decline a VoIP line');
      assert(
        call.body.disposable_number_action === 'NO_ACTION',
        'we asked them to decline a disposable number',
      );
      assert(
        call.body.duplicated_phone_number_action === 'NO_ACTION',
        'we asked them to decline a duplicate number',
      );
    },
  );
  console.log('• Approved: carrier, line type, channel and duplicate count all kept');
  console.log('• Nothing is ever auto-declined for us (appendix J, the one rule)');

  const outcomes: Array<[string, string]> = [
    ['Failed', 'wrong_code'],
    ['Declined', 'declined'],
    ['Expired or Not Found', 'expired'],
  ];
  for (const [theirs, ours] of outcomes) {
    await withStub(
      () => ({ status: 200, body: { status: theirs, message: theirs, phone: null } }),
      async (baseUrl) => {
        const p = new DiditOtpProvider({ apiKey: KEY, baseUrl });
        const r = await p.check({ toE164: '+237671234567', code: '000000' });
        assert(r.outcome === ours, `"${theirs}" read as ${r.outcome}, expected ${ours}`);
      },
    );
  }
  console.log('• Failed / Declined / Expired each map to their own outcome, not to one blur');

  // ---- Errors, and who is to blame for them --------------------------------
  const errors: Array<[number, unknown, string]> = [
    [400, { detail: 'invalid phone number' }, 'caller'],
    [403, { detail: 'You do not have permission to perform this action.' }, 'config'],
    [401, { detail: 'revoked' }, 'config'],
    [429, { detail: 'too many' }, 'rate'],
    [502, { code: 'phone_provider_unavailable' }, 'provider'],
    [500, { detail: 'boom' }, 'provider'],
  ];
  for (const [status, body, expected] of errors) {
    await withStub(
      () => ({ status, body }),
      async (baseUrl) => {
        const p = new DiditOtpProvider({ apiKey: KEY, baseUrl });
        const err = await blameOf(() =>
          p.start({ toE164: '+237671234567', channel: 'whatsapp', locale: 'en' }),
        );
        assert(err.blame === expected, `${status} blamed ${err.blame}, expected ${expected}`);
      },
    );
  }
  console.log('• 400→caller, 401/403→config, 429→rate, 5xx→provider');
  console.log('  (an empty balance is a 403, so it never tells a user their number is wrong)');

  // ---- Not JSON -------------------------------------------------------------
  await withStub(
    () => ({ status: 200, body: 'not json at all' }),
    async (baseUrl) => {
      const p = new DiditOtpProvider({ apiKey: KEY, baseUrl });
      // JSON.stringify of a string is valid JSON, so ask for something that is
      // valid JSON but not an object: the adapter must still refuse it.
      const r = await p
        .start({ toE164: '+237671234567', channel: 'whatsapp', locale: 'en' })
        .catch((e: unknown) => e);
      assert(r instanceof OtpDeliveryError, 'a non-object body was accepted');
    },
  );
  console.log('• A body that is not an object is refused rather than read as a success');
}

async function api(jwt: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`http://localhost:${PORT}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      'X-Client-Platform': 'android',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null } as {
    status: number;
    data: any;
  };
}

async function partB(): Promise<void> {
  const reachable = await fetch(`http://localhost:${PORT}/health`)
    .then((r) => r.ok)
    .catch(() => false);
  if (!reachable) {
    console.log(`\nPart B — skipped: no dev server on :${PORT}.`);
    return;
  }
  assert(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY, 'Supabase env not set');
  console.log('\nPart B — the live endpoints\n');

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `phone-test-${Date.now()}@seamflow.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  assert(!error, `createUser: ${error?.message}`);
  const userId = data.user!.id;

  try {
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const s = await anon.auth.signInWithPassword({ email, password: PASSWORD });
    assert(!s.error, `signIn: ${s.error?.message}`);
    const jwt = s.data.session!.access_token;

    let r = await api(jwt, 'GET', '/me/phone');
    assert(r.status === 200, `GET /me/phone: ${r.status}`);
    assert(r.data.verified === false, 'a brand new account claims a verified number');
    const enabled: boolean = r.data.enabled;
    console.log(`• Status reads: verified=false, enabled=${enabled}`);

    if (!enabled) {
      // Correct and worth asserting: with no provider the endpoints must refuse
      // rather than pretend, because the badge downstream depends on this.
      r = await api(jwt, 'POST', '/me/phone/start', { phone: '671234567', defaultCountry: 'cm' });
      assert(r.status === 503, `with no provider, start answered ${r.status}, expected 503`);
      console.log('• With no provider configured, start answers 503 rather than pretending');
      return;
    }

    // A number that is not a number, whatever the country.
    r = await api(jwt, 'POST', '/me/phone/start', { phone: '12', defaultCountry: 'cm' });
    assert(r.status === 400, `nonsense number answered ${r.status}, expected 400`);
    console.log('• A number that cannot exist is refused before anything is sent');

    // Local format plus a country, which is how a Cameroonian actually types it.
    r = await api(jwt, 'POST', '/me/phone/start', {
      phone: '6 71 23 45 67',
      defaultCountry: 'cm',
      channel: 'whatsapp',
    });
    assert(r.status === 200, `start: ${r.status} ${JSON.stringify(r.data)}`);
    assert(r.data.phone === '+237671234567', `not normalised to E.164: ${r.data.phone}`);
    assert(r.data.ttlMinutes > 0, 'no TTL came back for the screen to render');
    const expiresIn = new Date(r.data.expiresAt).getTime() - Date.now();
    assert(expiresIn > 0, 'the code expired before it was sent');
    console.log(
      `• "6 71 23 45 67" + CM became +237671234567, valid ${r.data.ttlMinutes} minutes`,
    );

    // A wrong code says nothing useful to an attacker.
    r = await api(jwt, 'POST', '/me/phone/confirm', { code: '000000' });
    assert(r.status === 400, `a wrong code answered ${r.status}`);
    const msg = JSON.stringify(r.data);
    for (const leak of ['expired', 'attempt', 'no challenge', 'not found']) {
      assert(!msg.toLowerCase().includes(leak), `the error leaks "${leak}": ${msg}`);
    }
    console.log('• A wrong code is refused without saying which knob to turn');

    // Still not verified, and nothing was committed to the account.
    r = await api(jwt, 'GET', '/me/phone');
    assert(r.data.verified === false, 'a failed confirm marked the number verified');
    r = await api(jwt, 'GET', '/me');
    assert(!r.data.phone, 'an unproven number was written to the account');
    console.log('• Nothing lands on the account until a code actually succeeds');

    // The per-number cap. Two more sends are allowed, the fourth is not.
    for (let i = 0; i < 2; i++) {
      r = await api(jwt, 'POST', '/me/phone/start', {
        phone: '671234567',
        defaultCountry: 'cm',
      });
      assert(r.status === 200, `send ${i + 2} answered ${r.status}`);
    }
    r = await api(jwt, 'POST', '/me/phone/start', { phone: '671234567', defaultCountry: 'cm' });
    assert(r.status === 429, `the fourth send answered ${r.status}, expected 429`);
    console.log('• The fourth code for one number in an hour is refused');
  } finally {
    await admin.from('phone_verifications').delete().eq('user_id', userId);
    await admin.from('users').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
  }
}

async function main(): Promise<void> {
  await partA();
  await partB();
  console.log('\nPhone verification tests passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
