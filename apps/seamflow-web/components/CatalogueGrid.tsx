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
    inquire: string;
    /** Pre-rendered on the server: "From 45,000 FCFA" per post id. */
    priceById: Record<string, string>;
    /**
     * Ready-made `wa.me` links, one per design, built on the server.
     *
     * Empty when the tailor has published no WhatsApp number — the button is
     * then not rendered at all, rather than shown dead. Built server-side for
     * the same reason prices are: the message text comes from the copy object,
     * which holds functions that cannot cross into a client component.
     */
    inquireHrefById: Record<string, string>;
  };
  /**
   * Design to open on first paint, from `?d=<id>` in the URL.
   *
   * Read on the server so a shared link renders the right piece immediately
   * rather than flashing the wall first.
   */
  initialDesignId?: string;
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
export function CatalogueGrid({ posts, currency, labels, initialDesignId }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(() => {
    if (!initialDesignId) return null;
    const i = posts.findIndex((p) => p.id === initialDesignId);
    return i === -1 ? null : i;
  });
  const active = activeIndex == null ? null : (posts[activeIndex] ?? null);

  // The open design lives in the URL as `?d=<id>`.
  //
  // Two things fall out of that and both matter on a phone: a design can be
  // sent to someone directly, which is the whole point of the enquiry message
  // below; and the hardware back button closes the lightbox instead of leaving
  // the catalogue entirely, because opening one pushes a history entry.
  //
  // `history.pushState` rather than a Next router push — this is the same page
  // with a different overlay open, and routing would re-run the server
  // component and refetch the catalogue on every tap.
  const open = useCallback(
    (index: number) => {
      setActiveIndex(index);
      const post = posts[index];
      if (!post || typeof window === 'undefined') return;
      window.history.pushState({ designId: post.id }, '', `?d=${post.id}`);
    },
    [posts],
  );

  const close = useCallback(() => {
    if (typeof window === 'undefined') {
      setActiveIndex(null);
      return;
    }
    if (window.history.state?.designId) {
      // Unwind the entry we pushed, so back doesn't reopen what was just closed.
      window.history.back();
      return;
    }
    // Arrived straight on `?d=<id>` from a shared link, so there is no entry of
    // ours to unwind. Strip the parameter anyway — leaving it would mean the
    // URL still names a design nothing is showing, and a reload would reopen
    // what the reader just closed.
    setActiveIndex(null);
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  // Back/forward is the authority on what's open — including the first paint,
  // where the entry came from the server rather than from pushState.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      const id = new URLSearchParams(window.location.search).get('d');
      const i = id ? posts.findIndex((p) => p.id === id) : -1;
      setActiveIndex(i === -1 ? null : i);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [posts]);

  return (
    <>
      <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {posts.map((post, i) => (
          <Tile
            key={post.id}
            post={post}
            price={labels.priceById[post.id]}
            onOpen={() => open(i)}
          />
        ))}
      </div>

      {active ? (
        <Lightbox
          post={active}
          price={labels.priceById[active.id]}
          inquireHref={labels.inquireHrefById[active.id]}
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
      className="group mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-border/60 bg-surface text-start shadow-sm transition-shadow duration-200 hover:shadow-card sm:mb-4"
    >
      <div
        className="relative w-full overflow-hidden bg-surfaceElevated"
        // `isolation: isolate` is load-bearing on iOS Safari, not decoration.
        // A backdrop-filter inside a rounded `overflow: hidden` ancestor is
        // composited against the wrong layer there and bleeds past the corner
        // radius; giving this box its own stacking context confines it.
        style={{ aspectRatio: ratio, isolation: 'isolate' }}
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
            className="absolute end-2 top-2 flex items-center gap-1 rounded-full bg-ink/65 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white backdrop-blur-sm"
          >
            <StackIcon />
            {count}
          </span>
        ) : null}

        {label || price ? <Caption label={label} price={price} /> : null}
      </div>
    </button>
  );
}

/**
 * The name-and-price bar, laid over the bottom of the photo.
 *
 * A progressive blur, not a single frosted panel. One uniform
 * `backdrop-filter` has a hard top edge that reads as a grey box stuck on the
 * picture; stacking a few layers whose blur increases downward — each masked
 * to its own band — makes the photo dissolve into the text instead. The eye
 * reads it as depth rather than as a rectangle.
 *
 * How the stack works: every layer covers the whole bar but is revealed only
 * across part of it by its mask gradient, and the layers overlap. Reading down
 * the bar you pass through 0 → 1 → 2 → 3 → 4 active layers, so the blur ramps
 * smoothly instead of stepping.
 *
 * Legibility does not come from the blur. Blurring a photo leaves its
 * brightness alone, so white text over a blurred white dress is still white on
 * white — and this catalogue is full of white dresses. A separate dark scrim,
 * transparent at the top and ~72% at the bottom, is what actually guarantees
 * contrast; the blur only softens what is behind it.
 *
 * Platform notes, since this is read almost entirely on phones:
 *   - `-webkit-backdrop-filter` is required on iOS Safari; without it every
 *     layer is a no-op and only the scrim shows.
 *   - `-webkit-mask-image` is required for older Android WebViews.
 *   - `transform: translateZ(0)` on the container: iOS composites
 *     backdrop-filter against the wrong layer inside an `overflow: hidden`
 *     rounded parent unless something forces its own stacking context, which
 *     shows up as the blur bleeding past the card's rounded corner.
 */
/**
 * A tight, dark shadow rather than a soft glow.
 *
 * The scrim already supplies the broad contrast; this only sharpens the letter
 * edges where a light detail in the photo happens to sit directly behind a
 * stroke. Two stacked shadows — one hairline, one softer — keep small text
 * crisp without the muddy halo a single large blur produces.
 */
const TEXT_SHADOW = '0 1px 1px rgba(12,10,9,0.55), 0 1px 6px rgba(12,10,9,0.35)';

function Caption({ label, price }: { label?: string | null; price?: string }) {
  // Bands overlap so no seam is visible between one blur strength and the next.
  const layers = [
    { blur: 1, from: '0%', to: '38%' },
    { blur: 2, from: '22%', to: '58%' },
    { blur: 4, from: '42%', to: '76%' },
    { blur: 8, from: '62%', to: '100%' },
  ];

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0"
      style={{ transform: 'translateZ(0)' }}
    >
      <div className="relative">
        {layers.map((l) => (
          <div
            key={l.blur}
            aria-hidden
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${l.blur}px)`,
              WebkitBackdropFilter: `blur(${l.blur}px)`,
              maskImage: `linear-gradient(to bottom, transparent ${l.from}, black ${l.to})`,
              WebkitMaskImage: `linear-gradient(to bottom, transparent ${l.from}, black ${l.to})`,
            }}
          />
        ))}

        {/* The scrim, which is what actually keeps the text readable. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(16,13,11,0) 0%, rgba(16,13,11,0.28) 45%, rgba(16,13,11,0.72) 100%)',
          }}
        />

        <div className="relative px-3 pb-2.5 pt-7">
          {label ? (
            // The brand serif, as used by the shop name and section headings.
            // It separates the garment's NAME from the interface text around
            // it, and its heavier stems hold up better over a photograph than
            // the UI sans, whose thin strokes break up against busy fabric.
            <p
              className="line-clamp-2 font-display text-[14px] font-semibold leading-tight tracking-[-0.01em] text-white"
              style={{ textShadow: TEXT_SHADOW }}
            >
              {label}
            </p>
          ) : null}
          {price ? (
            // Deliberately NOT the serif: a price is data, not a name. Tabular
            // figures keep the digits on a common width so a column of prices
            // lines up down the wall, and the wide tracking plus small size
            // reads as a label rather than competing with the title.
            <p
              className="mt-1 text-[11px] font-semibold uppercase tabular-nums tracking-[0.07em] text-white/85"
              style={{ textShadow: TEXT_SHADOW }}
            >
              {price}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Lightbox({
  post,
  price,
  inquireHref,
  labels,
  currency,
  onClose,
}: {
  post: FeedPostPublic;
  price?: string;
  inquireHref?: string;
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
      // Arrow keys follow the reading direction, not the axis: in an RTL
      // carousel the next photo is to the LEFT, so a fixed mapping would run
      // the gallery backwards for Arabic readers.
      const forward = getComputedStyle(document.documentElement).direction === 'rtl' ? -1 : 1;
      if (e.key === 'ArrowRight') go(forward);
      if (e.key === 'ArrowLeft') go(-forward);
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
        className="absolute end-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-ink shadow-pill"
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
              <ArrowButton dir="prev" label={labels.prev} onClick={() => go(-1)} />
              <ArrowButton dir="next" label={labels.next} onClick={() => go(1)} />

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

        {post.title || post.caption || meta.length || price || inquireHref ? (
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

            {/* Absent entirely when the tailor has published no WhatsApp
                number. A dead contact button on a shop page is worse than
                none — and its absence is the tailor's cue to add one. */}
            {inquireHref ? (
              <a
                href={inquireHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2.5 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white shadow-pill transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99]"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35Z" />
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.25-4.35c0-4.53 3.7-8.22 8.23-8.22a8.17 8.17 0 0 1 5.81 2.41 8.17 8.17 0 0 1 2.41 5.82c0 4.53-3.69 8.2-8.23 8.2Z" />
                </svg>
                {labels.inquire}
              </a>
            ) : null}
          </figcaption>
        ) : null}
      </figure>
    </div>
  );
}

/**
 * A carousel control, keyed on what it DOES rather than where it sits.
 *
 * The previous version took `side: 'left' | 'right'` and hardcoded both the
 * position and the glyph from it — which bakes in the assumption that "previous"
 * is on the left. In Arabic it is on the right. Naming the prop `dir` and
 * placing it with `start-`/`end-` means the button follows the reading
 * direction, and `rtl:-scale-x-100` turns the chevron to match.
 */
function ArrowButton({
  dir,
  label,
  onClick,
}: {
  dir: 'prev' | 'next';
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-ink shadow-pill transition-opacity hover:bg-background ${
        dir === 'prev' ? 'start-3' : 'end-3'
      }`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="rtl:-scale-x-100"
      >
        <path d={dir === 'prev' ? 'M15 18 9 12l6-6' : 'm9 18 6-6-6-6'} />
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
