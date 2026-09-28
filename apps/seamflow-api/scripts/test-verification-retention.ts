/**
 * Verification evidence retention (appendix J.4).
 *
 * The app tells every tailor who submits: "Only SeamFlow staff see these
 * photos, and we delete them 90 days after we decide." This test is what keeps
 * that sentence true, so it checks the boundaries in both directions — a job
 * that deletes too eagerly is as much a bug as one that never runs:
 *
 *   deleted   a request decided 91 days ago
 *   deleted   a request withdrawn 91 days ago (it has no decided_at, so its
 *             clock runs from submission — otherwise its photos live forever)
 *   KEPT      a request decided 5 days ago
 *   KEPT      a PENDING request submitted 200 days ago — its clock has not
 *             started, and staff still need the evidence to decide
 *
 * And in every case the DECISION survives: the row, its status and its note are
 * kept forever; only the pictures go.
 *
 * Drives the job through its dev-only hook (POST /health/run-verification-
 * retention, which 404s in production) rather than waiting for the 04:20 cron.
 * Requires the dev server on PORT. Run with: pnpm test:verification-retention
 */
import { createClient } from '@supabase/supabase-js';

const PORT = process.env.PORT ?? '3001';

/** Fire the sweep and return how many requests it cleared. */
async function sweep(): Promise<number> {
  const res = await fetch(`http://localhost:${PORT}/health/run-verification-retention`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`run-verification-retention: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { cleared: number }).cleared;
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'verification-evidence';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

/** A 2x2 PNG, so the objects under test are real files in real storage. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAF0lEQVQIHWP8z8Dwn4GBgYkBBIAMEAcAHcQCAWz2gEcAAAAASUVORK5CYII=',
  'base64',
);

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

async function main(): Promise<void> {
  assert(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY, 'Supabase env not set');
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userIds: string[] = [];
  const tailorIds: string[] = [];
  const paths: string[] = [];

  const makeTailor = async (label: string) => {
    const email = `retention-${label}-${Date.now()}@seamflow.local`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: 'change-me-only-used-in-tests-9f3a2c',
      email_confirm: true,
    });
    assert(!error, `createUser: ${error?.message}`);
    const userId = data.user!.id;
    userIds.push(userId);
    await admin.from('users').upsert({ id: userId, email });
    const { data: t, error: te } = await admin
      .from('tailors')
      .insert({
        user_id: userId,
        business_name: `Retention ${label}`,
        country_code: 'CM',
        currency: 'XAF',
      })
      .select('id')
      .single();
    assert(!te, `create tailor: ${te?.message}`);
    tailorIds.push(t!.id);
    return { userId, tailorId: t!.id as string };
  };

  /** A request with one real photo in storage, at a chosen point in the past. */
  const makeRequest = async (
    label: string,
    fields: Record<string, unknown>,
  ): Promise<{ id: string; path: string }> => {
    const { userId, tailorId } = await makeTailor(label);
    const path = `${userId}/${label}.png`;
    const up = await admin.storage.from(BUCKET).upload(path, PNG, {
      contentType: 'image/png',
      upsert: true,
    });
    assert(!up.error, `upload: ${up.error?.message}`);
    paths.push(path);

    const { data, error } = await admin
      .from('verification_requests')
      .insert({
        tailor_id: tailorId,
        evidence: [{ kind: 'work_photo', storagePath: path }],
        ...fields,
      })
      .select('id')
      .single();
    assert(!error, `insert request: ${error?.message}`);
    return { id: data!.id as string, path };
  };

  const exists = async (path: string): Promise<boolean> => {
    const slash = path.lastIndexOf('/');
    const { data } = await admin.storage
      .from(BUCKET)
      .list(path.slice(0, slash), { search: path.slice(slash + 1) });
    return (data ?? []).length > 0;
  };

  try {
    // ---- Four requests, four different ages and states ---------------------
    const oldDecided = await makeRequest('old-decided', {
      status: 'rejected',
      submitted_at: daysAgo(120),
      decided_at: daysAgo(91),
      decision_note: 'We could not tell this was your workshop.',
    });
    const oldWithdrawn = await makeRequest('old-withdrawn', {
      status: 'withdrawn',
      submitted_at: daysAgo(91),
    });
    const recentDecided = await makeRequest('recent-decided', {
      status: 'approved',
      submitted_at: daysAgo(10),
      decided_at: daysAgo(5),
      decision_note: 'Photo at the machine.',
    });
    const oldPending = await makeRequest('old-pending', {
      status: 'pending',
      submitted_at: daysAgo(200),
    });
    console.log('• Four requests seeded, with real files in storage');

    // ---- Run it ------------------------------------------------------------
    const cleared = await sweep();
    assert(cleared >= 2, `expected at least 2 cleared, got ${cleared}`);
    console.log(`• The job cleared ${cleared} request(s)`);

    // ---- What must be gone -------------------------------------------------
    assert(!(await exists(oldDecided.path)), 'a photo decided 91 days ago is still in storage');
    assert(
      !(await exists(oldWithdrawn.path)),
      'a photo withdrawn 91 days ago is still in storage',
    );
    console.log('• Photos past 90 days are gone, for decided AND withdrawn requests');

    // ---- What must remain --------------------------------------------------
    assert(await exists(recentDecided.path), 'a photo decided 5 days ago was deleted early');
    assert(
      await exists(oldPending.path),
      'a PENDING request lost its evidence — staff can no longer decide it',
    );
    console.log('• A recent decision keeps its photos');
    console.log('• A pending request keeps its photos however old it is: its clock has not started');

    // ---- The decision outlives the pictures --------------------------------
    const { data: rows } = await admin
      .from('verification_requests')
      .select('id, status, decision_note, evidence, evidence_purged_at')
      .in('id', [oldDecided.id, oldWithdrawn.id, recentDecided.id, oldPending.id]);

    const byId = new Map((rows ?? []).map((r: { id: string }) => [r.id, r as any]));

    const old = byId.get(oldDecided.id);
    assert(old, 'the decided request was deleted instead of cleared');
    assert(old.status === 'rejected', 'the decision was lost');
    assert(
      old.decision_note === 'We could not tell this was your workshop.',
      'the decision note was lost',
    );
    assert(old.evidence_purged_at, 'the purge was not recorded');
    assert((old.evidence ?? []).length === 0, 'a path to a deleted file was left behind');
    console.log('• The decision and its note survive; the evidence array is emptied');

    const pending = byId.get(oldPending.id);
    assert(!pending.evidence_purged_at, 'a pending request was marked purged');
    assert((pending.evidence ?? []).length === 1, 'a pending request lost its evidence entry');
    console.log('• Nothing about the pending request changed at all');

    // ---- Running twice must be safe ----------------------------------------
    const second = await sweep();
    assert(second === 0 || second < cleared, 'the job re-cleared rows it had already cleared');
    console.log('• A second run finds nothing left to do');
  } finally {
    for (const id of tailorIds) {
      await admin.from('verification_requests').delete().eq('tailor_id', id);
      await admin.from('tailors').delete().eq('id', id);
    }
    if (paths.length) await admin.storage.from(BUCKET).remove(paths);
    for (const id of userIds) {
      await admin.from('users').delete().eq('id', id);
      await admin.auth.admin.deleteUser(id);
    }
  }
  console.log('\nVerification retention test passed.');
}

main().catch((err) => {
  console.error('✗ Test failed:', err);
  process.exit(1);
});
