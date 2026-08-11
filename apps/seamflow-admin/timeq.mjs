import postgres from 'postgres';
import fs from 'node:fs';
const url = fs.readFileSync('.env.local','utf8').split('=').slice(1).join('=').trim();
const sql = postgres(url, { prepare: false, max: 3, idle_timeout: 20 });
const t = async (name, fn) => { const s = Date.now(); try { await fn(); } catch(e){ console.log(`  ${name}: ERROR ${e.message.slice(0,60)}`); return; } console.log(`  ${name}: ${Date.now()-s}ms`); };

await t('warmup/connect', () => sql`select 1`);
await t('counts',   () => sql`select (select count(*) from users) a,(select count(*) from tailors) b,(select count(*) from clients) c,(select count(*) from orders) d,(select count(*) from invoices) e,(select count(*) from feed_posts where status='published') f,(select count(*) from tailor_works) g,(select count(*) from conversations) h,(select count(*) from messages) i,(select count(*) from order_claims) j,(select count(*) from notifications) k`);
await t('tailors',  () => sql`select t.id,(select count(*) from clients c where c.tailor_id=t.id) x,(select count(*) from orders o where o.tailor_id=t.id) y,(select count(*) from invoices i where i.tailor_id=t.id) z,(select count(*) from feed_posts f where f.tailor_id=t.id and f.status='published') p,(select max(o.created_at) from orders o where o.tailor_id=t.id) l from tailors t order by t.created_at desc`);
await t('activity', () => sql`(select 'tailor' k, business_name l, created_at a from tailors) union all (select 'order', order_name, created_at from orders) order by a desc limit 18`);
await t('health',   () => sql`select (select count(*) from (select tailor_id, phone from clients group by tailor_id, phone having count(*)>1) d) x,(select count(*) from orders o where not exists (select 1 from order_claims c where c.order_id=o.id)) y`);
const s = Date.now();
await Promise.all([sql`select 1`, sql`select 2`, sql`select 3`, sql`select 4`, sql`select 5`, sql`select 6`, sql`select 7`]);
console.log(`  7 parallel trivial queries: ${Date.now()-s}ms`);
await sql.end();
