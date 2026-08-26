'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FeedPostPublic } from '@seamflow/schemas';

interface Props {
  posts: FeedPostPublic[];
  currency: string;
  /**
   * Only the strings this component actually renders, passed individually
   * rather than as the whole CatalogueCopy object.
   *
   * That object holds functions (`metaTitle`, `pieces`, …) and this is a
   * client component — React cannot serialize a function across the
   * server/client boundary and throws at render, not at build. Keep this prop
   * list flat and primitive.
   */
  closeLabel: string;
}

/**
 * The catalogue itself — a Pinterest-style masonry wall.
 *
 * CSS multi-column, not a JS masonry library. The reason is that this page is
 * server-rendered and read on cheap Android phones over patchy connections:
 * a JS layout pass means the images land in a single column, then jump once
 * the script boots. `columns` lays out correctly in the HTML the server sent,
 * before any of our JavaScript runs.
 *
 * The trade-off is real and worth stating: multi-column fills top-to-bottom
 * per column, so reading order is down-then-across rather than left-to-right.
 * For a gallery of unordered work that costs nothing — nobody reads a catalogue
 * in sequence. Don't reach for this on anything where order carries meaning.
 *
 * Each tile reserves its true aspect ratio from the stored width/height, so
 * the wall doesn't reflow as images arrive. Posts predating those columns fall
 * back to 3:4, the commonest shape for a garment photograph.
 */
export function CatalogueGrid({ posts, currency, closeLabel }: Props) {
  const [active, setActive] = useState<FeedPostPublic | null>(null);

  const close = useCallback(() => setActive(null), []);

  // Escape closes, and while a photo is open the page behind must not scroll —
  // on a phone, a lightbox over a scrolling page is how you lose your place in
  // a long catalogue.
  //
  // The obvious lock, `body { overflow: hidden }`, causes the very problem it
  // is meant to prevent. Hiding the body's overflow collapses its scroll
  // height to the viewport, so the browser clamps the current scroll offset —
  // open a photo two thirds down a long wall and the page silently jumps, then
  // closing it leaves you somewhere you never were. Measured here: 700px
  // became 383px on a twelve-piece catalogue, and the taller the wall the
  // worse it gets.
  //
  // Pinning the body at a negative offset instead keeps the rendered position
  // identical, and the scroll is restored explicitly on close.
  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
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
  }, [active, close]);

  return (
    <>
      <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {posts.map((post) => (
          <Tile key={post.id} post={post} currency={currency} onOpen={() => setActive(post)} />
        ))}
      </div>

      {active ? (
        <Lightbox post={active} closeLabel={closeLabel} currency={currency} onClose={close} />
      ) : null}
    </>
  );
}

function Tile({
  post,
  currency,
  onOpen,
}: {
  post: FeedPostPublic;
  currency: string;
  onOpen: () => void;
}) {
  const ratio = aspectRatio(post);
  const price = formatPrice(post.startingPrice, post.currency ?? currency);

  return (
    <button
      type="button"
      onClick={onOpen}
      // `break-inside-avoid` is what stops a column break through the middle of
      // a card — without it, multi-column will happily slice one in half.
      className="group mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-border/60 bg-surface text-left shadow-sm transition-shadow duration-200 hover:shadow-card sm:mb-4"
    >
      <div className="relative w-full overflow-hidden bg-surfaceElevated" style={{ aspectRatio: ratio }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.thumbnailUrl}
          alt={post.caption ?? post.garmentType ?? ''}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      </div>

      {post.caption || price ? (
        <div className="px-3 py-2.5">
          {post.caption ? (
            <p className="line-clamp-2 text-[13px] leading-snug text-ink/90">{post.caption}</p>
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
  closeLabel,
  currency,
  onClose,
}: {
  post: FeedPostPublic;
  closeLabel: string;
  currency: string;
  onClose: () => void;
}) {
  const price = formatPrice(post.startingPrice, post.currency ?? currency);
  const meta = [post.garmentType, post.fabric, post.occasion].filter(Boolean) as string[];

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
        aria-label={closeLabel}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-ink shadow-pill"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <figure
        onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-3xl overflow-y-auto rounded-3xl bg-background shadow-card"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.imageUrl}
          alt={post.caption ?? post.garmentType ?? ''}
          className="w-full object-contain"
          style={{ aspectRatio: aspectRatio(post) }}
        />
        {post.caption || meta.length || price ? (
          <figcaption className="px-5 py-4">
            {post.caption ? (
              <p className="text-[15px] leading-relaxed text-ink">{post.caption}</p>
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

/**
 * Reserve the tile's real shape so the wall never reflows mid-load.
 *
 * Clamped rather than used raw: one extremely tall photo in a masonry column
 * pushes everything below it off the first screen, and a very wide one becomes
 * a letterbox slot. The bounds keep an unusual upload from deciding the layout
 * for the whole catalogue.
 */
function aspectRatio(post: FeedPostPublic): string {
  const { width, height } = post;
  if (!width || !height || width <= 0 || height <= 0) return '3 / 4';
  const r = width / height;
  const clamped = Math.min(Math.max(r, 0.6), 1.6);
  return `${clamped}`;
}

/**
 * Money, in the tailor's own currency.
 *
 * `startingPrice` arrives as a numeric(12,2) string in MAJOR units — "25000.00"
 * means twenty-five thousand francs, not two hundred and fifty. Don't divide by
 * 100 here; that mistake is easy to make because plenty of payment code stores
 * minor units, and it would show every West African price two orders of
 * magnitude too small.
 *
 * The digit count still has to come from the currency: XAF and XOF — the home
 * markets — have no minor unit at all, so a stored "25000.00" must print as
 * FCFA 25,000 and never as FCFA 25,000.00.
 */
function formatPrice(amount: string | null, currency: string | null): string | null {
  if (amount == null || amount === '' || !currency) return null;
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;

  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    // Unknown ISO code — better a plain number with a suffix than nothing.
    return `${value} ${currency}`;
  }
}
