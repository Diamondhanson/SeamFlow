// ── /d/<id> — a shareable, link-previewable page for one feed design ─────────
//
// This is what a viewer shares OUT of the app (WhatsApp, Facebook, …). Being
// server-rendered on the marketing domain, it can emit the Open Graph tags that
// make those platforms draw the dress preview — something the client-rendered
// app web build cannot do. A recipient without the app lands here and sees the
// design directly, with a path to the tailor and to the rest of SeamFlow. There
// is deliberately no person-to-person messaging: the only outbound is to the
// maker (their storefront) or into the app.

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ApiError } from '@seamflow/api-client';
import type { FeedPostDetail, FeedPostPublic } from '@seamflow/schemas';
import { publicApi } from '../../../../lib/api';
import { SITE, WEB_APP_URL } from '../../../../lib/i18n';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Feed images are public + stable, but keep the page fresh-ish for new work.
export const revalidate = 1800; // 30 minutes

async function load(id: string): Promise<FeedPostDetail | null> {
  try {
    return await publicApi().feed.get(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

function designName(post: FeedPostPublic): string {
  return post.title ?? post.garmentType ?? 'A design';
}

function priceText(post: FeedPostPublic): string | null {
  if (!post.startingPrice) return null;
  const n = Number(post.startingPrice);
  const amount = Number.isFinite(n) ? new Intl.NumberFormat('en-US').format(n) : post.startingPrice;
  return `From ${post.currency ? post.currency + ' ' : ''}${amount}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await load(id);
  if (!data) return { title: `Design · ${SITE.name}` };
  const post = data.post;
  const name = designName(post);
  const by = post.tailor.businessName;
  const title = `${name} · ${by}`;
  const price = priceText(post);
  const description =
    [price, `by ${by}${post.city ? ' · ' + post.city : ''}`].filter(Boolean).join(' — ') ||
    `A custom ${post.garmentType ?? 'design'} by ${by} on ${SITE.name}.`;
  const url = `${SITE.url}/d/${id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: SITE.name,
      images: [
        {
          url: post.imageUrl,
          alt: name,
          ...(post.width && post.height ? { width: post.width, height: post.height } : {}),
        },
      ],
    },
    twitter: { card: 'summary_large_image', title, description, images: [post.imageUrl] },
  };
}

export default async function DesignSharePage({ params }: PageProps) {
  const { id } = await params;
  const data = await load(id);
  if (!data) notFound();

  const post = data.post;
  const name = designName(post);
  const by = post.tailor.businessName;
  const price = priceText(post);
  const storefront = post.tailor.slug ? `/t/${post.tailor.slug}` : null;
  const messageHref = storefront ?? WEB_APP_URL;
  const more = data.moreLikeThis.filter((p) => p.id !== post.id).slice(0, 6);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-10 sm:pt-14">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-4 h-px w-12 bg-accent/70" />
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          {SITE.name}
        </span>
      </header>

      {/* The design, large. */}
      <figure className="overflow-hidden rounded-4xl border border-border/70 bg-surface shadow-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.imageUrl} alt={name} className="w-full object-cover" />
      </figure>

      <section className="mt-6 text-center">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          {name}
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          by{' '}
          {storefront ? (
            <a href={storefront} className="font-medium text-ink underline-offset-2 hover:underline">
              {by}
            </a>
          ) : (
            <span className="font-medium text-ink">{by}</span>
          )}
          {post.city ? ` · ${post.city}` : ''}
        </p>
        {price ? <p className="mt-1 text-[15px] font-semibold text-primary">{price}</p> : null}
        {post.caption ? (
          <p className="mx-auto mt-4 max-w-md whitespace-pre-line text-[15px] leading-relaxed text-ink/85">
            {post.caption}
          </p>
        ) : null}
      </section>

      {/* Actions — to the maker, and into the app. Never person-to-person. */}
      <section className="mt-8 flex flex-col items-center gap-3">
        <a
          href={messageHref}
          className="inline-flex w-full max-w-xs items-center justify-center rounded-full bg-primary px-6 py-3.5 text-base font-semibold text-onPrimary shadow-soft transition hover:opacity-90"
        >
          Message {by}
        </a>
        <a
          href={WEB_APP_URL}
          className="inline-flex w-full max-w-xs items-center justify-center rounded-full border border-border bg-surface px-6 py-3.5 text-base font-semibold text-ink transition hover:bg-surfaceElevated"
        >
          Browse more on {SITE.name}
        </a>
      </section>

      {/* A taste of the maker's other work — each opens its own shareable page. */}
      {more.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            More from {by}
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {more.map((p) => (
              <a
                key={p.id}
                href={`/d/${p.id}`}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-border/60 bg-surface"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumbnailUrl}
                  alt={designName(p)}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="mt-14 text-center">
        <div className="mx-auto mb-4 h-px w-16 bg-border" />
        <p className="text-xs text-muted">
          Discovered on{' '}
          <a href={WEB_APP_URL} className="font-display font-semibold text-ink/80 hover:underline">
            {SITE.name}
          </a>{' '}
          — where clothes are made for you.
        </p>
      </footer>
    </main>
  );
}
