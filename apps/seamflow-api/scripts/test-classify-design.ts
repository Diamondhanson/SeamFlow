/**
 * Does the design classifier describe a real garment correctly?
 *
 * Goes through the live HTTP route, so this covers auth, the DTO, the
 * tenant-prefix check and the prompt — not just the model call.
 *
 * What matters here is not "did it return JSON" (a forced tool call
 * guarantees that) but "are the values inside our vocabulary, and are they
 * RIGHT" — because a classifier that confidently proposes plausible-but-wrong
 * chips is worse than an empty form. A tailor will untick one wrong chip.
 * They will not untick five, and after that they stop trusting the whole
 * screen.
 *
 * Real feed photos are copied into a throwaway tailor's own prefix so the
 * ownership check is exercised rather than bypassed. Everything is removed
 * again at the end.
 *
 * Requires the dev server on PORT. Run: pnpm test:classify
 */
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import {
  DESIGN_ATTRIBUTES,
  DESIGN_COLORS,
  GARMENT_TYPES,
  attributeLabel,
  colorLabel,
  photoIssueTip,
  topPhotoIssue,
} from '@seamflow/schemas';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DATABASE_URL = process.env.DATABASE_URL!;
const PORT = process.env.PORT ?? '3001';

const EMAIL = `classify-test-${Date.now()}@seamflow.local`;
const PASSWORD = 'change-me-only-used-in-tests-7c20ab';

const GARMENT_KEYS = new Set(GARMENT_TYPES.map((g) => g.key));
const COLOR_KEYS = new Set(DESIGN_COLORS.map((c) => c.key));
const ATTR_KEYS = new Set(DESIGN_ATTRIBUTES.map((a) => a.key));

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE);
  const anon = createClient(SUPABASE_URL, ANON);
  const sql = postgres(DATABASE_URL, { prepare: false });

  // Real photos of real garments — a synthetic image would prove nothing.
  const samples = await sql`
    select public_path, caption, garment_type
    from feed_posts
    where status = 'published'
    order by created_at desc
    limit 4`;

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (cErr) throw cErr;
  const userId = created.user!.id;

  await sql`insert into users (id, email, role, full_name)
            values (${userId}, ${EMAIL}, 'tailor', 'Classify Test')
            on conflict (id) do nothing`;
  const [tailor] = await sql`
    insert into tailors (user_id, business_name, country_code, currency)
    values (${userId}, 'Classify Test Shop', 'CM', 'XAF') returning id`;
  const tailorId = tailor!.id as string;

  const { data: signIn } = await anon.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  const jwt = signIn!.session!.access_token;

  const copied: string[] = [];
  let violations = 0;
  let classified = 0;

  try {
    for (const row of samples) {
      const src = row.public_path as string;
      const dest = `${tailorId}/${src.split('/').pop()}`;

      const cp = await admin.storage.from('feed').copy(src, dest);
      if (cp.error) {
        console.log(`  (skipped ${src} — ${cp.error.message})`);
        continue;
      }
      copied.push(dest);

      const t0 = Date.now();
      const res = await fetch(`http://localhost:${PORT}/ai/classify-design`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
        // The tailor's own words go with the photo — that is the flow the
        // publish screen uses, so it is the flow worth testing.
        body: JSON.stringify({
          storagePath: dest,
          bucket: 'feed',
          caption: row.caption,
          garmentType: row.garment_type,
        }),
      });
      const ms = Date.now() - t0;
      const c = (await res.json()) as any;

      console.log('\n' + '─'.repeat(72));
      console.log('tailor wrote :', JSON.stringify(row.garment_type), '·',
        JSON.stringify((row.caption as string | null)?.slice(0, 60) ?? null));

      if (!res.ok) {
        console.log(`  ✗ HTTP ${res.status}:`, JSON.stringify(c).slice(0, 200));
        continue;
      }
      classified++;

      const bad: string[] = [];
      if (c.garmentKey && !GARMENT_KEYS.has(c.garmentKey)) bad.push(`garment:${c.garmentKey}`);
      for (const k of c.colors ?? []) if (!COLOR_KEYS.has(k)) bad.push(`color:${k}`);
      for (const k of c.attributes ?? []) if (!ATTR_KEYS.has(k)) bad.push(`attr:${k}`);

      // One shape, one length, one sleeve, one neckline — enforced server-side.
      const groups = new Map<string, string>();
      for (const k of c.attributes ?? []) {
        const g = DESIGN_ATTRIBUTES.find((a) => a.key === k)?.group;
        if (!g || !['silhouette', 'length', 'sleeve', 'neckline'].includes(g)) continue;
        if (groups.has(g)) bad.push(`two ${g}: ${groups.get(g)} + ${k}`);
        else groups.set(g, k);
      }
      if ((c.colors ?? []).includes('multicolour') && (c.colors ?? []).length > 1) {
        bad.push('multicolour alongside named colours');
      }
      violations += bad.length;

      console.log(`model said   : (${ms}ms)`);
      console.log('  garment  :', c.garmentKey ?? '—', '| audience:', c.audience ?? '—',
        '| occasion:', c.occasion ?? '—');
      console.log('  fabric   :', c.fabric ?? '—');
      console.log('  colours  :', (c.colors ?? []).map((k: string) => colorLabel(k)).join(', ') || '—');
      console.log('  style    :', (c.attributes ?? []).map((k: string) => attributeLabel(k)).join(', ') || '—');
      console.log('  title    :', c.title ?? '—');
      console.log('  caption  :', c.caption ?? '—');
      const q = c.quality ?? { score: null, issues: [] };
      const top = topPhotoIssue(q.issues ?? []);
      console.log(`  QUALITY  : ${q.score ?? '—'}/100  issues=[${(q.issues ?? []).join(', ') || 'none'}]`);
      console.log('  would say:', top ? photoIssueTip(top) : '(nothing — stays silent)');
      if (bad.length) console.log('  ✗ OUTSIDE VOCABULARY:', bad.join(', '));
    }

    // The ownership check must actually bite.
    const foreign = await fetch(`http://localhost:${PORT}/ai/classify-design`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath: samples[0]!.public_path, bucket: 'feed' }),
    });
    console.log('\n' + '─'.repeat(72));
    if (foreign.status === 400) {
      console.log("✓ another tailor's photo is refused (400)");
    } else {
      console.error(`✗ another tailor's photo was NOT refused — got ${foreign.status}`);
      violations++;
    }
  } finally {
    if (copied.length) await admin.storage.from('feed').remove(copied);
    await sql`delete from tailors where id = ${tailorId}`;
    await sql`delete from users where id = ${userId}`;
    await admin.auth.admin.deleteUser(userId);
    await sql.end();
  }

  console.log('─'.repeat(72));
  if (!classified) {
    console.error('✗ nothing was classified — the run proved nothing.');
    process.exit(1);
  }
  if (violations) {
    console.error(`✗ ${violations} problem(s). The tool enums are not holding.`);
    process.exit(1);
  }
  console.log(`✓ ${classified} design(s) classified, every value inside the vocabulary.`);
  console.log('  Accuracy is a human judgement — read the rows above.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
