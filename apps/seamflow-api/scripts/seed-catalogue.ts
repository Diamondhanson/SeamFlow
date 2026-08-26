// ============================================================================
// Fill a tailor's portfolio with a demo catalogue, so the shareable page at
// /t/<slug> can be looked at with real photographs instead of an empty grid.
//
//   npm run seed:catalogue -- --email you@example.com          # seed
//   npm run seed:catalogue -- --email you@example.com --dry    # fetch only
//   npm run seed:catalogue -- --email you@example.com --purge  # remove it again
//
// THIS WRITES DEMO DATA TO WHATEVER DATABASE .env POINTS AT, which for this
// project is the shared Supabase — there is no separate staging instance. The
// designs it creates are indistinguishable from real ones in the UI, so seed a
// throwaway account rather than a tailor's live shop, and keep --purge in mind.
//
// It writes the same shapes WorksService.create + publish would: a tailor_works
// row whose cover columns mirror position 0, one tailor_work_images row per
// angle, a feed_posts row, and one feed_post_images row per angle with the
// pixels copied into the public `feed` bucket. It deliberately does NOT call
// the API, because that would need a signed-in user's JWT; the trade-off is
// that if publish() changes, this has to change with it.
//
// Photographs come from Unsplash's CDN, sized down on the way through. Their
// search API refuses unauthenticated requests, so the photo ids below were
// collected by hand rather than fetched — replacing them means gathering new
// ids from a browser session.
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const WORKS_BUCKET = 'works';
const FEED_BUCKET = 'feed';

interface SeedDesign {
  name: string | null;
  desc: string | null;
  /** Major units, as a numeric(12,2) string. Null means "no price shown". */
  price: string | null;
  garment: string;
  audience: 'women' | 'men' | 'unisex' | 'children';
  occasion: 'wedding' | 'traditional' | 'corporate' | 'casual' | 'party';
  fabric: string;
  /** Unsplash photo ids. Several ids = one design photographed from several angles. */
  imgs: string[];
}

// A deliberate spread: one-photo designs and carousels, priced and unpriced,
// named and unnamed — so every branch of the catalogue UI has something to
// render, including the empty ones.
const DESIGNS: SeedDesign[] = [
  { name: 'Ndop Ceremonial Gown', desc: 'Full-length ceremonial gown in hand-woven Ndop cloth, boned bodice and a sweeping train. Cut to measure; allow three weeks.', price: '185000', garment: 'gown', audience: 'women', occasion: 'traditional', fabric: 'Ndop cloth',
    imgs: ['photo-1663044022903-caa195cb5b2e', 'photo-1663044022894-68a5e6bccd64', 'photo-1663044022913-8913ff9ff2bc', 'photo-1663044022968-baba8bb04e23'] },
  { name: 'Poolside Kaftan', desc: 'Loose resort kaftan in printed voile. Falls just below the knee, side slits, fully lined yoke.', price: '42000', garment: 'kaftan', audience: 'women', occasion: 'casual', fabric: 'Printed voile',
    imgs: ['photo-1753192108606-b4a2bc9e5661', 'photo-1753192108753-81be0db2f7fe', 'photo-1753192105151-afa3e56d8b12'] },
  { name: 'Emerald Wrapper Set', desc: 'Two-piece wrapper and headwrap in emerald damask. Sold as a set; the headwrap is cut from the same bolt so the sheen matches.', price: '78000', garment: 'wrapper', audience: 'women', occasion: 'traditional', fabric: 'Damask',
    imgs: ['photo-1726276262263-b3568334e7a8', 'photo-1726276262265-b615e46cab5a', 'photo-1726276262267-ebb01cfa0982'] },
  { name: 'Three-Piece Wedding Suit', desc: 'Slim-cut three-piece in Italian wool. Half-canvassed, working cuffs, lined in bemberg. Two fittings included.', price: '245000', garment: 'suit', audience: 'men', occasion: 'wedding', fabric: 'Italian wool',
    imgs: ['photo-1741606369311-8e3d4dbe4b8e', 'photo-1741606381476-62b024ca874e', 'photo-1741606369276-288bdc4bb970'] },
  { name: 'Sunday Floral Dress', desc: 'Fitted bodice, gathered midi skirt, concealed back zip. Cotton lawn that holds a press all day.', price: '36000', garment: 'dress', audience: 'women', occasion: 'casual', fabric: 'Cotton lawn',
    imgs: ['photo-1602058746409-a4adc6d68270', 'photo-1602058746258-e012b1c1197c', 'photo-1602058746304-2aeebbef0462'] },
  { name: 'White Lace Occasion Dress', desc: 'Long-sleeve lace over crepe lining, scalloped hem. Cut for weddings and naming ceremonies.', price: '96000', garment: 'dress', audience: 'women', occasion: 'wedding', fabric: 'Corded lace',
    imgs: ['photo-1629200468267-b926a7675ce2', 'photo-1629200468327-78bdb7e47c85', 'photo-1629200468328-87bf3adfb78b'] },
  { name: 'Ivory Column Dress', desc: 'Bias-cut ivory column with a soft cowl back. Deceptively simple — the fit is everything, so two fittings are included.', price: '120000', garment: 'dress', audience: 'women', occasion: 'party', fabric: 'Silk crepe',
    imgs: ['photo-1706092372694-223070e27695', 'photo-1706092373219-0316a8bbaad7', 'photo-1706092372553-63083273ad64'] },
  { name: 'Beaded Ceremonial Set', desc: 'Hand-beaded bodice with matching headpiece. Every panel is beaded flat before assembly, which is why it takes a month.', price: '310000', garment: 'set', audience: 'women', occasion: 'traditional', fabric: 'Beaded satin',
    imgs: ['photo-1757140448921-f120d58546dc', 'photo-1757140448528-332c4fa2a8a6', 'photo-1757140448241-ba7511316754'] },
  { name: 'Blue Print Two-Piece', desc: 'Wax print top and wide-leg trouser. The print is placed so the motif runs unbroken across the front seam.', price: '58000', garment: 'set', audience: 'women', occasion: 'casual', fabric: 'Wax print',
    imgs: ['premium_photo-1769339044486-b99df72740a5', 'premium_photo-1769339044563-7e77ab4c90a5'] },
  { name: 'Agbada, Cream', desc: 'Four-piece agbada with hand-embroidered neckline and chest panel. Cap included.', price: '165000', garment: 'agbada', audience: 'men', occasion: 'traditional', fabric: 'Guinea brocade',
    imgs: ['photo-1780601247035-e34a7b06d35b', 'photo-1762782777495-9d297f3d9d3d'] },
  { name: 'Red Wall Kaftan', desc: 'Straight-cut men\'s kaftan with a mandarin collar and side pockets. Everyday weight.', price: '52000', garment: 'kaftan', audience: 'men', occasion: 'casual', fabric: 'Cotton twill',
    imgs: ['premium_photo-1666866588011-20091428b091', 'premium_photo-1666866588000-37206d97faa8'] },
  { name: 'Fedora Suit', desc: 'Single-breasted two-piece with a soft shoulder. Photographed with the client\'s own hat.', price: '175000', garment: 'suit', audience: 'men', occasion: 'corporate', fabric: 'Wool blend',
    imgs: ['photo-1688651977966-9f762d6d9fcb', 'photo-1688651977552-bc9a2af1f948'] },
  { name: 'Orange Runway Gown', desc: 'Structured shoulder, column skirt, exposed back. Made for a show — can be toned down for a client.', price: '280000', garment: 'gown', audience: 'women', occasion: 'party', fabric: 'Duchess satin',
    imgs: ['photo-1733324961705-97bd6cd7f4ba'] },
  { name: 'Yellow Fan Dress', desc: null, price: '64000', garment: 'dress', audience: 'women', occasion: 'party', fabric: 'Taffeta',
    imgs: ['photo-1708170236215-b6edcad7f49a', 'photo-1708170236295-20ab8fbadcef'] },
  { name: 'Green Hallway Kaftan', desc: 'Men\'s kaftan in sage, straight hem, matching trouser. A quiet cut for a long day.', price: '48000', garment: 'kaftan', audience: 'men', occasion: 'casual', fabric: 'Linen blend',
    imgs: ['photo-1648329008114-bce0ec0b5950'] },
  { name: 'Gold and Black Boubou', desc: 'Oversized boubou with metallic thread at the cuffs and hem. Cut generously on purpose.', price: '142000', garment: 'boubou', audience: 'women', occasion: 'traditional', fabric: 'Brocade',
    imgs: ['photo-1663044022596-25bc5df1c6e0', 'photo-1663044022648-08bf87cfdc05'] },
  { name: 'Market Day Dress', desc: 'Sleeveless shift in cotton wax, deep pockets, no lining. Made to be worn hard and washed often.', price: '28000', garment: 'dress', audience: 'women', occasion: 'casual', fabric: 'Cotton wax',
    imgs: ['photo-1611853904829-6d0f4034ce2f'] },
  { name: null, desc: 'Off-shoulder in coral with a gathered waist. Client\'s own fabric.', price: '54000', garment: 'dress', audience: 'women', occasion: 'party', fabric: 'Chiffon',
    imgs: ['premium_photo-1666789257987-324048d00dfb'] },
  { name: 'Blue Sleeveless Shift', desc: 'Simple shift with a bound neckline, knee length. The easiest thing in the catalogue to wear.', price: '31000', garment: 'dress', audience: 'women', occasion: 'casual', fabric: 'Cotton poplin',
    imgs: ['photo-1601653233006-5c9fd30eab12'] },
  { name: 'Headwrap and Gown', desc: 'Full gown with a co-ordinated headwrap, both in the same print run so the colour matches exactly.', price: '88000', garment: 'gown', audience: 'women', occasion: 'traditional', fabric: 'Wax print',
    imgs: ['photo-1687052093309-7a14efa58ecb', 'photo-1687052001151-316f9356dbc0'] },
  { name: 'Patterned Day Dress', desc: null, price: null, garment: 'dress', audience: 'women', occasion: 'casual', fabric: 'Ankara',
    imgs: ['photo-1784160053632-6eddd51bda26'] },
  { name: 'Umbrella Field Gown', desc: 'Long gown with a full skirt, photographed on location. Made for an outdoor ceremony.', price: '104000', garment: 'gown', audience: 'women', occasion: 'wedding', fabric: 'Georgette',
    imgs: ['photo-1717454169727-faf491653536'] },
  { name: 'Groom\'s Blue Ensemble', desc: 'Matching groom and groomsmen set. Priced per piece; the group discount is worked out in person.', price: '132000', garment: 'set', audience: 'men', occasion: 'wedding', fabric: 'Shantung',
    imgs: ['photo-1663044022559-9a0e0215abea', 'photo-1663044022557-7d5d4c1d5318', 'photo-1663043994777-7ed4b4e6cba3'] },
  { name: 'Striped Djellaba', desc: 'Loose djellaba in a woven stripe. Unlined, deep hood, ankle length.', price: '46000', garment: 'djellaba', audience: 'men', occasion: 'casual', fabric: 'Woven stripe',
    imgs: ['premium_photo-1678388572156-8326c391927d'] },
  { name: 'Pink Palm Dress', desc: 'Tea-length with a sweetheart neckline and a soft A-line skirt.', price: '49000', garment: 'dress', audience: 'women', occasion: 'party', fabric: 'Cotton sateen',
    imgs: ['photo-1650562325232-538b70cccb32', 'photo-1650562325764-5c041c63e71f'] },
  { name: 'Red and Gold Ceremony Dress', desc: 'Fitted through the body with a gold-worked panel down the front. Heavy — it is meant to be.', price: '198000', garment: 'dress', audience: 'women', occasion: 'traditional', fabric: 'Aso-oke',
    imgs: ['photo-1618999114008-fbf937170cdb'] },
  { name: 'Green and Gold Crown Set', desc: 'Ceremonial set with a beaded crown. The crown is made to the client\'s head measurement, not a standard size.', price: '225000', garment: 'set', audience: 'women', occasion: 'traditional', fabric: 'Velvet and beadwork',
    imgs: ['photo-1590670796065-5c2469672e18'] },
  { name: 'Brown Floral Wrap Dress', desc: 'True wrap with a self-tie belt, no fastenings. Adjusts through a pregnancy, which is why clients keep ordering it.', price: '38000', garment: 'dress', audience: 'women', occasion: 'casual', fabric: 'Rayon',
    imgs: ['photo-1628144029346-8a98676311b6'] },
  { name: 'White Cover-Up', desc: null, price: '26000', garment: 'cover-up', audience: 'women', occasion: 'casual', fabric: 'Cotton gauze',
    imgs: ['photo-1753192103616-53e7e0ef83e6', 'photo-1753192104240-209f3fb568ef', 'photo-1753192104212-14f586962222', 'photo-1753192108400-7e73fb581d69'] },
  { name: 'Teal Floral Sundress', desc: 'Scoop neck, sleeveless, gathered at the waist. Photographed flat because the print is the point.', price: '33000', garment: 'dress', audience: 'women', occasion: 'casual', fabric: 'Cotton',
    imgs: ['photo-1523825036634-aab3cce05919'] },
  { name: 'Traditional Couple Set', desc: 'His-and-hers set cut from one bolt. Ordered together, fitted separately.', price: '210000', garment: 'set', audience: 'unisex', occasion: 'wedding', fabric: 'Aso-oke',
    imgs: ['photo-1648328168368-3a25f2152802', 'photo-1661332306744-70f9ed1a7f40'] },
  { name: 'Blue Headwrap Portrait Dress', desc: 'Boat neck with three-quarter sleeves and a matching wrap.', price: '57000', garment: 'dress', audience: 'women', occasion: 'traditional', fabric: 'Wax print',
    imgs: ['premium_photo-1769351842029-2e7f69df6e0b'] },
  { name: 'Striped Kaftan, Long', desc: 'Ankle-length striped kaftan, split sleeve, unlined. Cool enough for harmattan.', price: '44000', garment: 'kaftan', audience: 'women', occasion: 'casual', fabric: 'Cotton stripe',
    imgs: ['premium_photo-1770306559084-590d26a9cee3'] },
  { name: 'Green Two-Piece with Hat', desc: 'Cropped jacket and skirt with a covered hat. A church set — made to be seen from the back of the room.', price: '115000', garment: 'set', audience: 'women', occasion: 'traditional', fabric: 'Jacquard',
    imgs: ['photo-1696962701419-6f510910e838', 'photo-1696962678565-bee84e6b9cb6'] },];

const arg = (flag: string): string | undefined => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const has = (flag: string) => process.argv.includes(flag);

const email = arg('--email');
if (!email) {
  console.error('Pass --email <tailor account email>.');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (run via npm run seed:catalogue).');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

/** Ask the CDN for the rendition we want rather than downloading the original. */
const cdn = (id: string, w: number, q: number) =>
  `${id.startsWith('premium_photo') ? 'https://plus.unsplash.com' : 'https://images.unsplash.com'}/${id}?w=${w}&q=${q}&fm=jpg&fit=max`;

async function grab(u: string): Promise<Buffer> {
  const res = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${res.status} for ${u}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Pull width and height out of a JPEG's own header.
 *
 * The masonry grid reserves each tile's box from these before the image
 * arrives, so a design stored without them reflows the whole wall as it loads.
 * Reading the header avoids adding an image library for two numbers.
 */
function jpegSize(buf: Buffer): { width: number | null; height: number | null } {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1]!;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return { width: null, height: null };
}

async function put(bucket: string, path: string, bytes: Buffer): Promise<void> {
  const { error } = await db.storage
    .from(bucket)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`upload ${bucket}/${path}: ${error.message}`);
}

async function resolveTailor() {
  const { data: users, error } = await db.from('users').select('id').eq('email', email!).limit(1);
  if (error) throw new Error(`users: ${error.message}`);
  if (!users?.length) throw new Error(`No user with email ${email}`);

  const { data: tailors, error: tErr } = await db
    .from('tailors')
    .select('id, business_name, slug, city, currency')
    .eq('user_id', users[0]!.id)
    .limit(1);
  if (tErr) throw new Error(`tailors: ${tErr.message}`);
  if (!tailors?.length) throw new Error(`${email} has no tailor profile`);
  return tailors[0]!;
}

/**
 * Remove everything this script created for a tailor — rows AND pixels.
 *
 * Deletes storage objects BEFORE the rows, because the rows are the only
 * record of which objects to delete; doing it the other way round strands
 * every file in the bucket with nothing pointing at it.
 */
async function purge(tailorId: string): Promise<void> {
  const { data: posts } = await db.from('feed_posts').select('id').eq('tailor_id', tailorId);
  const postIds = (posts ?? []).map((p) => p.id as string);

  if (postIds.length) {
    const { data: pimgs } = await db
      .from('feed_post_images')
      .select('public_path, public_thumb_path')
      .in('feed_post_id', postIds);
    const paths = (pimgs ?? []).flatMap((i) => [i.public_path as string, i.public_thumb_path as string]);
    if (paths.length) await db.storage.from(FEED_BUCKET).remove(paths);
  }

  const { data: works } = await db.from('tailor_works').select('id').eq('tailor_id', tailorId);
  const workIds = (works ?? []).map((w) => w.id as string);

  if (workIds.length) {
    const { data: wimgs } = await db
      .from('tailor_work_images')
      .select('storage_bucket, storage_path, thumbnail_path')
      .in('work_id', workIds);
    const paths = (wimgs ?? [])
      .filter((i) => i.storage_bucket === WORKS_BUCKET)
      .flatMap((i) => [i.storage_path as string, i.thumbnail_path as string])
      .filter(Boolean);
    if (paths.length) await db.storage.from(WORKS_BUCKET).remove(paths);
  }

  // feed_post_images and tailor_work_images cascade from their parents.
  await db.from('feed_posts').delete().eq('tailor_id', tailorId);
  await db.from('tailor_works').delete().eq('tailor_id', tailorId);
  console.log(`Purged ${workIds.length} design(s) and ${postIds.length} post(s).`);
}

async function main() {
  const tailor = await resolveTailor();
  const tailorId = tailor.id as string;
  const currency = (tailor.currency as string) ?? 'XAF';
  const city = (tailor.city as string) ?? null;
  console.log(`${tailor.business_name} (${tailorId})`);

  if (has('--purge')) {
    await purge(tailorId);
    return;
  }

  const dry = has('--dry');
  let made = 0;

  for (const [n, d] of DESIGNS.entries()) {
    process.stdout.write(`[${n + 1}/${DESIGNS.length}] ${d.name ?? '(untitled)'} — ${d.imgs.length} photo(s) … `);

    // Fetch every angle before writing anything: a half-uploaded design shows
    // the catalogue a broken tile, which is worse than one that never started.
    const assets = [];
    for (const id of d.imgs) {
      const [fb, tb] = await Promise.all([grab(cdn(id, 1400, 80)), grab(cdn(id, 500, 70))]);
      assets.push({ fb, tb, ...jpegSize(fb) });
    }

    if (dry) {
      console.log(`ok (dry) ${assets.map((a) => `${a.width}x${a.height}`).join(' ')}`);
      made++;
      continue;
    }

    const workId = randomUUID();
    const postId = randomUUID();
    const cover = assets[0]!;

    const privatePaths: { p: string; tp: string; width: number | null; height: number | null }[] = [];
    for (const a of assets) {
      const id = randomUUID();
      const p = `${tailorId}/works/${id}.jpg`;
      const tp = `${tailorId}/works/${id}_thumb.jpg`;
      await put(WORKS_BUCKET, p, a.fb);
      await put(WORKS_BUCKET, tp, a.tb);
      privatePaths.push({ p, tp, width: a.width, height: a.height });
    }

    const { error: wErr } = await db.from('tailor_works').insert({
      id: workId,
      tailor_id: tailorId,
      source: 'upload',
      storage_bucket: WORKS_BUCKET,
      // Cover columns mirror images[0] — the invariant WorksService.syncCover owns.
      storage_path: privatePaths[0]!.p,
      thumbnail_path: privatePaths[0]!.tp,
      width: cover.width,
      height: cover.height,
      title: d.name,
      description: d.desc,
      garment_type: d.garment,
      audience: d.audience,
      fabric: d.fabric,
      occasion: d.occasion,
      tags: [],
      starting_price: d.price,
      currency: d.price ? currency : null,
    });
    if (wErr) throw new Error(`tailor_works: ${wErr.message}`);

    const { error: wiErr } = await db.from('tailor_work_images').insert(
      privatePaths.map((x, i) => ({
        work_id: workId,
        storage_bucket: WORKS_BUCKET,
        storage_path: x.p,
        thumbnail_path: x.tp,
        width: x.width,
        height: x.height,
        position: i,
      })),
    );
    if (wiErr) throw new Error(`tailor_work_images: ${wiErr.message}`);

    const publicPaths: { p: string; tp: string; width: number | null; height: number | null }[] = [];
    for (const [i, a] of assets.entries()) {
      const p = `${tailorId}/${postId}_${i}.jpg`;
      const tp = `${tailorId}/${postId}_${i}_thumb.jpg`;
      await put(FEED_BUCKET, p, a.fb);
      await put(FEED_BUCKET, tp, a.tb);
      publicPaths.push({ p, tp, width: a.width, height: a.height });
    }

    const { error: pErr } = await db.from('feed_posts').insert({
      id: postId,
      tailor_id: tailorId,
      work_id: workId,
      public_path: publicPaths[0]!.p,
      public_thumb_path: publicPaths[0]!.tp,
      width: cover.width,
      height: cover.height,
      title: d.name,
      caption: d.desc ?? d.name,
      garment_type: d.garment,
      audience: d.audience,
      fabric: d.fabric,
      occasion: d.occasion,
      tags: [],
      starting_price: d.price,
      currency: d.price ? currency : null,
      city,
      status: 'published',
    });
    if (pErr) throw new Error(`feed_posts: ${pErr.message}`);

    const { error: piErr } = await db.from('feed_post_images').insert(
      publicPaths.map((x, i) => ({
        feed_post_id: postId,
        public_path: x.p,
        public_thumb_path: x.tp,
        width: x.width,
        height: x.height,
        position: i,
      })),
    );
    if (piErr) throw new Error(`feed_post_images: ${piErr.message}`);

    made++;
    console.log('ok');
  }

  if (!dry && !tailor.slug) {
    // Without an address the catalogue is unreachable, and the whole point of
    // seeding is to look at it. Same value FeedService.ensureSlug would mint.
    const slug = (tailor.business_name as string)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const { error } = await db.from('tailors').update({ slug }).eq('id', tailorId).is('slug', null);
    if (error) console.warn(`slug not set: ${error.message}`);
    else console.log(`slug: ${slug}`);
  }

  console.log(`\n${made} design(s) ${dry ? 'fetched' : 'seeded'}.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
