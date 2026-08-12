// ============================================================================
// Feed & works — the supply that the consumer app is supposed to discover.
//
// This is the narrowest point in the whole product, so the page is built as a
// chain rather than a list of counts: a photo can only become public by
// travelling orders → order_photos → tailor_works → feed_posts, and every
// stage that loses rows is a stage worth seeing.
//
// The only route into that chain is opening an order, tapping one of its
// photos and choosing Publish. So an order with no photo can never produce
// public work, which makes "orders carrying a photo" a real ceiling on the
// marketplace rather than a piece of trivia.
// ============================================================================

import { sql } from '../db';
import { n } from './shared';

export interface FeedPage {
  chain: { key: string; label: string; value: number; note: string }[];
  works: {
    id: string;
    title: string | null;
    tailor: string;
    tailorId: string;
    source: string;
    garmentType: string | null;
    audience: string | null;
    occasion: string | null;
    published: boolean;
    createdAt: string;
  }[];
  posts: {
    id: string;
    caption: string | null;
    tailor: string;
    tailorId: string;
    status: string;
    garmentType: string | null;
    city: string | null;
    startingPrice: number | null;
    currency: string | null;
    createdAt: string;
  }[];
  byTailor: { id: string; tailor: string; orders: number; photos: number; works: number; published: number }[];
  designs: { total: number; tailors: number };
}

export async function getFeed(): Promise<FeedPage> {
  const [row] = await sql`
    select
      (select row_to_json(s) from (
        select
          (select count(*) from orders)                                   as orders,
          (select count(distinct order_id) from order_photos)             as orders_with_photos,
          (select count(*) from order_photos)                             as photos,
          (select count(*) from tailor_works)                             as works,
          (select count(*) from feed_posts)                               as posts,
          (select count(*) from feed_posts where status = 'published')    as published,
          (select count(*) from designs)                                  as designs,
          (select count(distinct tailor_id) from designs)                 as design_tailors
      ) s) as scalars,

      (select coalesce(json_agg(w), '[]'::json) from (
        select w.id, w.title, w.source::text as source, w.garment_type,
               w.audience::text as audience, w.occasion::text as occasion,
               w.created_at, t.business_name as tailor, t.id as tailor_id,
               exists (select 1 from feed_posts f
                         where f.work_id = w.id and f.status = 'published') as published
        from tailor_works w join tailors t on t.id = w.tailor_id
        order by w.created_at desc limit 50
      ) w) as works,

      (select coalesce(json_agg(p), '[]'::json) from (
        select p.id, p.caption, p.status::text as status, p.garment_type, p.city,
               p.starting_price::float8 as starting_price, p.currency, p.created_at,
               t.business_name as tailor, t.id as tailor_id
        from feed_posts p join tailors t on t.id = p.tailor_id
        order by p.created_at desc limit 50
      ) p) as posts,

      (select coalesce(json_agg(b), '[]'::json) from (
        select
          t.id, t.business_name as tailor,
          (select count(*) from orders o where o.tailor_id = t.id)::int as orders,
          (select count(*) from order_photos ph
             join orders o on o.id = ph.order_id where o.tailor_id = t.id)::int as photos,
          (select count(*) from tailor_works w where w.tailor_id = t.id)::int as works,
          (select count(*) from feed_posts f
             where f.tailor_id = t.id and f.status = 'published')::int as published
        from tailors t
        order by (select count(*) from order_photos ph
                    join orders o on o.id = ph.order_id where o.tailor_id = t.id) desc,
                 t.business_name
      ) b) as by_tailor
  `;

  const s = (row?.scalars ?? {}) as Record<string, unknown>;

  return {
    chain: [
      { key: 'orders', label: 'Orders', value: n(s.orders), note: 'every order ever created' },
      {
        key: 'with-photos',
        label: 'Orders carrying a photo',
        value: n(s.orders_with_photos),
        note: 'the only orders that can ever be published from',
      },
      { key: 'photos', label: 'Order photos', value: n(s.photos), note: 'individually publishable' },
      { key: 'works', label: 'Saved to the portfolio', value: n(s.works), note: 'a tailor kept it as work' },
      { key: 'published', label: 'Published to the feed', value: n(s.published), note: 'a client can discover it' },
    ],
    works: ((row?.works ?? []) as Record<string, unknown>[]).map((w) => ({
      id: w.id as string,
      title: (w.title as string) ?? null,
      tailor: w.tailor as string,
      tailorId: w.tailor_id as string,
      source: w.source as string,
      garmentType: (w.garment_type as string) ?? null,
      audience: (w.audience as string) ?? null,
      occasion: (w.occasion as string) ?? null,
      published: Boolean(w.published),
      createdAt: w.created_at as string,
    })),
    posts: ((row?.posts ?? []) as Record<string, unknown>[]).map((p) => ({
      id: p.id as string,
      caption: (p.caption as string) ?? null,
      tailor: p.tailor as string,
      tailorId: p.tailor_id as string,
      status: p.status as string,
      garmentType: (p.garment_type as string) ?? null,
      city: (p.city as string) ?? null,
      startingPrice: p.starting_price === null ? null : n(p.starting_price),
      currency: (p.currency as string) ?? null,
      createdAt: p.created_at as string,
    })),
    byTailor: ((row?.by_tailor ?? []) as Record<string, unknown>[]).map((b) => ({
      id: b.id as string,
      tailor: b.tailor as string,
      orders: n(b.orders),
      photos: n(b.photos),
      works: n(b.works),
      published: n(b.published),
    })),
    designs: { total: n(s.designs), tailors: n(s.design_tailors) },
  };
}
