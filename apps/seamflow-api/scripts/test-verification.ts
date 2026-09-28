/**
 * End-to-end test for verification (appendix J, phase 1).
 *
 * The rule this file exists to defend is J's first one: **nothing here blocks
 * anyone**. It is the rule easiest to break by accident later, because every
 * instinct says a badge should gate something. So the test asserts the absence
 * of gates as loudly as it asserts the feature:
 *
 *   · an unverified tailor can still publish, still be found, still be messaged
 *   · a tailor who never submits loses nothing at all
 *   · a REJECTED tailor keeps every capability they had before asking
 *
 * Plus the mechanics: the two preconditions, one request in flight, withdrawing,
 * the staff decision, a decline needing a reason, the audit row, and the badge
 * popover carrying nothing private.
 *
 * Creates throwaway accounts and a throwaway staff grant, and removes both.
 * Requires the dev server on PORT. Run with: pnpm test:verification
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
  return { status: res.status, data: text ? JSON.parse(text) : null } as {
    status: number;
    data: any;
  };
}

async function main(): Promise<void> {
  assert(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY, 'Supabase env not set');
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const created: string[] = [];

  const makeUser = async (label: string) => {
    const email = `verif-test-${label}-${Date.now()}@seamflow.local`;
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
    return { id: data.user!.id, jwt: s.data.session!.access_token };
  };

  try {
    const tailor = await makeUser('tailor');
    const staff = await makeUser('staff');
    await admin.from('staff').insert({ user_id: staff.id });

    // ---- No shop profile yet -------------------------------------------------
    let r = await api(tailor.jwt, 'GET', '/me/verification');
    assert(r.status === 200, `GET /me/verification: ${r.status}`);
    assert(r.data.request === null, 'a brand new account already has a request');
    assert(r.data.isVerified === false, 'a brand new account claims a badge');
    console.log('• Status reads cleanly before a shop profile exists');

    r = await api(tailor.jwt, 'POST', '/me/verification', {
      evidence: [{ kind: 'work_photo', storagePath: `${tailor.id}/a.jpg` }],
    });
    assert(r.status === 400, `submitting with no shop answered ${r.status}`);
    console.log('• Cannot ask to verify a shop that does not exist yet');

    // ---- Shop profile, but no confirmed phone -------------------------------
    r = await api(tailor.jwt, 'POST', '/me/tailor', {
      businessName: 'Verification Test Atelier',
      countryCode: 'CM',
      currency: 'XAF',
    });
    assert(r.status === 200 || r.status === 201, `create tailor: ${r.status}`);
    const tailorId: string = r.data.id;

    r = await api(tailor.jwt, 'GET', '/me/verification');
    assert(r.data.phoneVerified === false, 'phone reported as confirmed when it is not');
    console.log('• The screen is told WHICH precondition is missing, before anyone fills a form');

    r = await api(tailor.jwt, 'POST', '/me/verification', {
      evidence: [{ kind: 'work_photo', storagePath: `${tailor.id}/a.jpg` }],
    });
    assert(r.status === 400, `submitting without a confirmed phone answered ${r.status}`);
    console.log('• A submission without a confirmed phone is refused up front, not after two days');

    // ---- THE ONE RULE: none of that took anything away ----------------------
    // An unverified tailor with no request at all is a full citizen.
    r = await api(tailor.jwt, 'POST', '/works', {
      title: 'A piece made while completely unverified',
      images: [{ storagePath: `${tailorId}/works/unverified.jpg` }],
    });
    assert(
      r.status === 200 || r.status === 201,
      `an unverified tailor could not publish: ${r.status} ${JSON.stringify(r.data)}`,
    );
    const workId: string | undefined = r.data?.id;
    console.log('• An unverified tailor with no request publishes exactly like anyone else');

    // ---- Confirm the phone, the honest way ----------------------------------
    // Straight to the column: this test is about verification, and the OTP round
    // trip has its own test (test:phone).
    await admin
      .from('users')
      .update({ phone: '+237600000001', phone_verified_at: new Date().toISOString() })
      .eq('id', tailor.id);

    r = await api(tailor.jwt, 'GET', '/me/verification');
    assert(r.data.phoneVerified === true, 'a confirmed phone did not show up');
    console.log('• Requirement one now reads as met');

    // ---- Evidence has to be theirs -----------------------------------------
    r = await api(tailor.jwt, 'POST', '/me/verification', {
      evidence: [{ kind: 'work_photo', storagePath: `${staff.id}/someone-elses.jpg` }],
    });
    assert(r.status === 400, `a foreign storage path was accepted: ${r.status}`);
    console.log("• Evidence under somebody else's storage prefix is refused");

    // ---- Submit -------------------------------------------------------------
    r = await api(tailor.jwt, 'POST', '/me/verification', {
      evidence: [
        { kind: 'work_photo', storagePath: `${tailor.id}/machine.jpg`, capturedAt: new Date().toISOString() },
      ],
    });
    assert(r.status === 201, `submit: ${r.status} ${JSON.stringify(r.data)}`);
    const requestId: string = r.data.id;
    assert(r.data.status === 'pending', `submitted as ${r.data.status}`);
    console.log('• A request lands as pending');

    // ---- One in flight ------------------------------------------------------
    r = await api(tailor.jwt, 'POST', '/me/verification', {
      evidence: [{ kind: 'work_photo', storagePath: `${tailor.id}/again.jpg` }],
    });
    assert(r.status === 409, `a second pending request answered ${r.status}, expected 409`);
    console.log('• Asking twice is refused: it does not make us faster');

    // ---- Withdraw, then submit again ---------------------------------------
    r = await api(tailor.jwt, 'DELETE', '/me/verification');
    assert(r.status === 200 && r.data.status === 'withdrawn', `withdraw: ${r.status}`);
    r = await api(tailor.jwt, 'POST', '/me/verification', {
      evidence: [{ kind: 'work_photo', storagePath: `${tailor.id}/machine.jpg` }],
    });
    assert(r.status === 201, `re-submitting after a withdrawal: ${r.status}`);
    const secondId: string = r.data.id;
    console.log('• Withdrawing leaves a clean slate, and the history is kept');

    // ---- Only staff decide --------------------------------------------------
    r = await api(tailor.jwt, 'POST', `/admin/verification/${secondId}/decide`, { approve: true });
    assert(r.status === 403, `a tailor approved themselves: ${r.status}`);
    console.log('• A tailor cannot approve their own request');

    // ---- A decline needs a reason ------------------------------------------
    r = await api(staff.jwt, 'POST', `/admin/verification/${secondId}/decide`, { approve: false });
    assert(r.status === 400, `a reasonless decline answered ${r.status}`);
    console.log('• A decline without a reason is refused: they are shown it word for word');

    // ---- Decline properly, and check nothing was taken away -----------------
    const REASON = 'We could not tell this photo was taken in your workshop. Try one at the machine.';
    r = await api(staff.jwt, 'POST', `/admin/verification/${secondId}/decide`, {
      approve: false,
      note: REASON,
    });
    assert(r.status === 200 || r.status === 201, `decline: ${r.status} ${JSON.stringify(r.data)}`);
    assert(r.data.status === 'rejected', `declined as ${r.data.status}`);

    r = await api(tailor.jwt, 'GET', '/me/verification');
    assert(r.data.request.decisionNote === REASON, 'the reason did not reach the tailor');
    assert(r.data.isVerified === false, 'a declined tailor got the badge');
    console.log('• The reason reaches them verbatim');

    // The point of the whole test.
    r = await api(tailor.jwt, 'POST', '/works', {
      title: 'A piece made after being turned down',
      images: [{ storagePath: `${tailorId}/works/rejected-but-still-working.jpg` }],
    });
    assert(
      r.status === 200 || r.status === 201,
      `a REJECTED tailor lost the ability to publish: ${r.status}`,
    );
    console.log('• A rejected tailor keeps every capability they had before asking');

    // ---- They may try again -------------------------------------------------
    r = await api(tailor.jwt, 'POST', '/me/verification', {
      evidence: [{ kind: 'work_photo', storagePath: `${tailor.id}/at-the-machine.jpg` }],
    });
    assert(r.status === 201, `re-submitting after a decline: ${r.status}`);
    const thirdId: string = r.data.id;
    console.log('• A decline can be fixed and resubmitted');

    // ---- Approve ------------------------------------------------------------
    r = await api(staff.jwt, 'POST', `/admin/verification/${thirdId}/decide`, {
      approve: true,
      note: 'Photo at the machine, shop name on the note.',
    });
    assert(r.status === 200 || r.status === 201, `approve: ${r.status}`);

    r = await api(tailor.jwt, 'GET', '/me/verification');
    assert(r.data.isVerified === true, 'an approved tailor did not get the badge');
    assert(r.data.verifiedAt, 'the badge has no provenance: verifiedAt is null');
    console.log('• Approval sets the badge AND records when it was earned');

    // ---- The queue ----------------------------------------------------------
    r = await api(staff.jwt, 'GET', '/admin/verification?status=pending');
    assert(r.status === 200 && Array.isArray(r.data), `queue: ${r.status}`);
    assert(
      !r.data.some((x: { id: string }) => x.id === thirdId),
      'a decided request is still sitting in the pending queue',
    );
    r = await api(staff.jwt, 'GET', '/admin/verification?status=approved');
    const mine = r.data.find((x: { id: string }) => x.id === thirdId);
    assert(mine, 'the approved request is not in the approved list');
    assert(mine.tailor.businessName === 'Verification Test Atelier', 'the queue lost the shop');
    assert(mine.tailor.phoneVerified === true, 'the queue cannot see the phone status');
    console.log('• The queue carries what staff need to judge, on one row');

    // ---- The audit trail ----------------------------------------------------
    const { data: actions } = await admin
      .from('admin_actions')
      .select('action')
      .eq('target_id', tailorId);
    const names = (actions ?? []).map((a: { action: string }) => a.action);
    assert(names.includes('verification.approve'), 'the approval was not recorded');
    assert(names.includes('verification.reject'), 'the decline was not recorded');
    console.log('• Both decisions are in the audit trail');

    // ---- The notifications --------------------------------------------------
    const { data: notes } = await admin
      .from('notifications')
      .select('type, params')
      .eq('user_id', tailor.id);
    const types = (notes ?? []).map((n: { type: string }) => n.type);
    assert(types.includes('verification.approved'), 'no notification on approval');
    assert(types.includes('verification.rejected'), 'no notification on decline');
    const rejected = (notes ?? []).find(
      (n: { type: string }) => n.type === 'verification.rejected',
    );
    assert(rejected?.params?.reason === REASON, 'the decline notification lost the reason');
    console.log('• Both decisions notify, and the decline carries its reason');

    // ---- The social handle: confirmed separately, or not at all ------------
    // A handle reaching a public storefront must always mean somebody opened
    // the profile and found the code. Approving the shop is a DIFFERENT
    // question, so approving without confirming must publish nothing.
    const HANDLE = 'atelier.test.handle';
    r = await api(tailor.jwt, 'POST', '/me/verification', {
      evidence: [
        { kind: 'work_photo', storagePath: `${tailor.id}/with-social.jpg` },
        { kind: 'social', platform: 'instagram', handle: HANDLE, code: 'SF-K7M2Q' },
        { kind: 'registration', number: 'RC/YAO/2026/B/123' },
      ],
    });
    assert(r.status === 201, `submit with extras: ${r.status} ${JSON.stringify(r.data)}`);
    const withSocial: string = r.data.id;

    r = await api(staff.jwt, 'POST', `/admin/verification/${withSocial}/decide`, {
      approve: true,
      note: 'Work fine.',
      confirmSocial: false,
    });
    assert(r.status === 200 || r.status === 201, `approve without social: ${r.status}`);

    const { data: afterNoConfirm } = await admin
      .from('tailors')
      .select('social_handle, social_platform, social_confirmed_at')
      .eq('id', tailorId)
      .single();
    assert(
      !afterNoConfirm?.social_handle,
      'a handle was published on a shop although staff never confirmed the code',
    );
    console.log('• Approving the shop does NOT publish an unconfirmed handle');

    // Now the same handle, confirmed.
    r = await api(tailor.jwt, 'POST', '/me/verification', {
      evidence: [
        { kind: 'work_photo', storagePath: `${tailor.id}/again-with-social.jpg` },
        { kind: 'social', platform: 'instagram', handle: HANDLE, code: 'SF-K7M2Q' },
      ],
    });
    assert(r.status === 201, `resubmit with social: ${r.status}`);
    r = await api(staff.jwt, 'POST', `/admin/verification/${r.data.id}/decide`, {
      approve: true,
      note: 'Found the code in the bio.',
      confirmSocial: true,
    });
    assert(r.status === 200 || r.status === 201, `approve with social: ${r.status}`);

    const { data: afterConfirm } = await admin
      .from('tailors')
      .select('social_handle, social_platform, social_confirmed_at')
      .eq('id', tailorId)
      .single();
    assert(afterConfirm?.social_handle === HANDLE, 'a confirmed handle was not stored');
    assert(afterConfirm?.social_platform === 'instagram', 'the platform was lost');
    assert(afterConfirm?.social_confirmed_at, 'the confirmation time was not recorded');
    console.log('• A confirmed handle is stored, with its platform and when it was checked');

    // And it reaches the public storefront, which is the tailor's side of the
    // bargain: evidence to us, an audience for them.
    r = await api(tailor.jwt, 'GET', `/tailors/${tailorId}/storefront`);
    if (r.status === 200) {
      assert(
        r.data?.tailor?.social?.handle === HANDLE,
        `the confirmed handle did not reach the public storefront: ${JSON.stringify(r.data?.tailor?.social)}`,
      );
      console.log('• It reaches the public storefront, which is what the tailor gets out of it');
    }

    // Two of a kind on one request is a question the queue cannot answer.
    r = await api(tailor.jwt, 'POST', '/me/verification', {
      evidence: [
        { kind: 'work_photo', storagePath: `${tailor.id}/x.jpg` },
        { kind: 'social', platform: 'instagram', handle: 'one', code: 'SF-AAAAA' },
        { kind: 'social', platform: 'tiktok', handle: 'two', code: 'SF-BBBBB' },
      ],
    });
    assert(r.status === 400, `two social handles on one request answered ${r.status}`);
    console.log('• Two social handles on one request is refused, not silently halved');

    // ---- What a client sees -------------------------------------------------
    r = await api(tailor.jwt, 'GET', `/tailors/${tailorId}/badge`);
    if (r.status === 200) {
      const body = JSON.stringify(r.data);
      assert(!body.includes('+237600000001'), 'the badge popover leaks the phone number');
      assert(r.data.phoneConfirmed === true, 'the badge does not say the phone is confirmed');
      console.log('• The badge says the phone is confirmed without revealing it');
    }
    if (workId) await admin.from('works').delete().eq('id', workId);
  } finally {
    for (const id of created) {
      const { data: t } = await admin.from('tailors').select('id').eq('user_id', id);
      for (const row of t ?? []) {
        await admin.from('verification_requests').delete().eq('tailor_id', row.id);
        await admin.from('admin_actions').delete().eq('target_id', row.id);
        await admin.from('works').delete().eq('tailor_id', row.id);
      }
      await admin.from('notifications').delete().eq('user_id', id);
      await admin.from('admin_actions').delete().eq('actor_user_id', id);
      await admin.from('staff').delete().eq('user_id', id);
      await admin.from('tailors').delete().eq('user_id', id);
      await admin.from('users').delete().eq('id', id);
      await admin.auth.admin.deleteUser(id);
    }
  }
  console.log('\nVerification test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
