'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FeedPostPublic } from '@seamflow/schemas';

interface Props {
  posts: FeedPostPublic[];
  currency: string;
  /**
   * Only the strings this component renders, passed individually rather than
   * as the whole CatalogueCopy object.
   *
   * That object holds functions (`metaTitle`, `pieces`, …) and this is a
   * client component — React cannot serialize a function across the
   * server/client boundary and throws at render, not at build. Keep this prop
   * list flat and primitive.
   */
  labels: {
    close: string;
    next: string;
    prev: string;
    /** Pre-rendered on the server: "From 45,000 FCFA" per post id. */
    priceById: Record<string, string>;
  };
}

/**
 * The catalogue itself — a Pinterest-style masonry wall.
 *
 * CSS multi-column, not a JS masonry library. This page is server-rendered and
 * read on cheap Android phones over patchy connections: a JS layout pass means
 * the images land in a single column, then jump once the script boots.
 * `columns` lays out correctly in the HTML the server sent.
 *
 * The trade-off is real: multi-column fills top-to-bottom per column, so
 * reading order is down-then-across. For a gallery of unordered work that
 * costs nothing. Don't reach for this where order carries meaning.
 *
 * A design with several angles shows its cover on the wall with a photo-count
 * badge, and swipes in the lightbox. Putting the carousel in the tile itself
 * was considered and rejected — on a phone a horizontal swipe inside a
 * vertically scrolling wall fights the scroll, and the wall stops being
 * scannable.
 */
export function CatalogueGrid({ posts, currency, labels }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex == null ? null : (posts[activeIndex] ?? null);

  const close = useCallback(() => setActiveIndex(null), []);

  return (
    <>
      <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {posts.map((post, i) => (
          <Tile
            key={post.id}
            post={post}
            price={labels.priceById[post.id]}
            onOpen={() => setActiveIndex(i)}
          />
        ))}
      </div>

      {active ? (
        <Lightbox
          post={active}
          price={labels.priceById[active.id]}
          labels={labels}
          currency={currency}
          onClose={close}
        />
      ) : null}
    </>
  );
}

function Tile({
  post,
  price,
  onOpen,
}: {
  post: FeedPostPublic;
  price?: string;
  onOpen: () => void;
}) {
  const ratio = aspectRatio(post.width, post.height);
  const count = post.images.length;
  const label = post.title ?? post.caption;

  return (
    <button
      type="button"
      onClick={onOpen}
      // `break-inside-avoid` is what stops a column break through the middle of
      // a card — without it, multi-column will happily slice one in half.
      className="group mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-border/60 bg-surface text-left shadow-sm transition-shadow duration-200 hover:shadow-card sm:mb-4"
    >
      <div
        className="relative w-full overflow-hidden bg-surfaceElevated"
        style={{ aspectRatio: ratio }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.thumbnailUrl}
          alt={label ?? post.garmentType ?? ''}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />

        {count > 1 ? (
          <span
            aria-hidden
            className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-ink/65 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white backdrop-blur-sm"
          >
            <StackIcon />
            {count}
          </span>
        ) : null}
      </div>

      {label || price ? (
        <div className="px-3 py-2.5">
          {label ? (
            <p className="line-clamp-2 text-[13px] leading-snug text-ink/90">{label}</p>
          ) : null}
          {price ? (
            <p className="mt-1 text-[12px] font-medium tracking-tight text-accent">{price}</p>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}

function Lightbox({
  post,
  price,
  labels,
  currency,
  onClose,
}: {
  post: FeedPostPublic;
  price?: string;
  labels: Props['labels'];
  currency: string;
  onClose: () => void;
}) {
  const images = post.images.length > 0 ? post.images : [];
  const [index, setIndex] = useState(0);
  const count = images.length;

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count],
  );

  // Escape closes; arrows step through the angles. While a photo is open the
  // page behind must not scroll — on a phone, a lightbox over a scrolling page
  // is how you lose your place in a long catalogue.
  //
  // The obvious lock, `body { overflow: hidden }`, causes the very problem it
  // is meant to prevent: hiding the body's overflow collapses its scroll
  // height, so the browser clamps the current offset — open a photo two thirds
  // down and the page silently jumps, then closing leaves you somewhere you
  // never were. Pinning the body at a negative offset keeps the rendered
  // position identical, and the scroll is restored explicitly on close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };

    const { scrollY } = window;
    const body = document.body;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    window.addEventListener('keydown', onKey);
    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      // `instant` — an animated scroll here reads as the page drifting away
      // after the photo closes.
      window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, go]);

  const current = images[index];
  const meta = [post.garmentType, post.fabric, post.occasion].filter(Boolean) as string[];
  void currency;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={labels.close}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-ink shadow-pill"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <figure
        onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-3xl overflow-y-auto rounded-3xl bg-background shadow-card"
      >
        <div className="relative">
          {/* The frame keeps the cover's shape for every angle. Without a fixed
              box, stepping from a portrait front view to a landscape detail
              shot would resize the whole dialog under the reader's finger. */}
          <div
            className="w-full overflow-hidden bg-surfaceElevated"
            style={{ aspectRatio: aspectRatio(post.width, post.height) }}
          >
            {current ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.imageUrl}
                alt={post.title ?? post.caption ?? ''}
                className="h-full w-full object-contain"
              />
            ) : null}
          </div>

          {count > 1 ? (
            <>
              <ArrowButton side="left" label={labels.prev} onClick={() => go(-1)} />
              <ArrowButton side="right" label={labels.next} onClick={() => go(1)} />

              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                {images.map((img, i) => (
                  <span
                    key={img.position}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/55'
                    }`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        {post.title || post.caption || meta.length || price ? (
          <figcaption className="px-5 py-4">
            {post.title ? (
              <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                {post.title}
              </h3>
            ) : null}
            {post.caption && post.caption !== post.title ? (
              <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-ink/85">
                {post.caption}
              </p>
            ) : null}
            {meta.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {meta.map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-surfaceElevated px-2.5 py-1 text-[11px] font-medium capitalize tracking-wide text-muted"
                  >
                    {m.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            ) : null}
            {price ? (
              <p className="mt-3 text-sm font-semibold tracking-tight text-accent">{price}</p>
            ) : null}
          </figcaption>
        ) : null}
      </figure>
    </div>
  );
}

function ArrowButton({
  side,
  label,
  onClick,
}: {
  side: 'left' | 'right';
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-ink shadow-pill transition-opacity hover:bg-background ${
        side === 'left' ? 'left-3' : 'right-3'
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={side === 'left' ? 'M15 18 9 12l6-6' : 'm9 18 6-6-6-6'} />
      </svg>
    </button>
  );
}

function StackIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="8" y="3" width="13" height="13" rx="2" />
      <path d="M16 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2" />
    </svg>
  );
}

/**
 * Reserve the tile's real shape so the wall never reflows mid-load.
 *
 * Clamped rather than used raw: one extremely tall photo in a masonry column
 * pushes everything below it off the first screen, and a very wide one becomes
 * a letterbox slot. The bounds keep an unusual upload from deciding the layout
 * for the whole catalogue.
 */
function aspectRatio(width: number | null, height: number | null): string {
  if (!width || !height || width <= 0 || height <= 0) return '3 / 4';
  const r = width / height;
  const clamped = Math.min(Math.max(r, 0.6), 1.6);
  return `${clamped}`;
}
