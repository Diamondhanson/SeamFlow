// ============================================================================
// Cache headers for the public surface.
//
// Discover, a storefront and a catalogue are byte-identical for everyone who
// asks. Nothing on them is per-caller: the images come from the PUBLIC `feed`
// bucket via getPublicUrl, so the URLs are stable and carry no signature — the
// feed service was written that way on purpose ("the feed bucket is public, so
// URLs are stable and need no signing. That's what lets the feed be
// CDN-cached"). The header to make that true was simply never set, and a live
// check came back `cf-cache-status: DYNAMIC`.
//
// So every anonymous browse woke a free-tier instance in Oregon, which queried
// a database in Ireland, to rebuild a page it had just built for somebody else.
//
// 60 seconds, because a tailor publishing a design wants to see it on Discover
// shortly after — not instantly, but within the time it takes to switch tabs
// and look. `stale-while-revalidate` lets the CDN keep answering from a slightly
// old copy while it refreshes behind the scenes, which is what stops a spike
// from reaching the origin at all.
//
// NOT applied to /public/orders/:token or /public/invoices/:token. Those are
// addressed by a secret and show one client's order: `public` there would let a
// shared cache hand that page to the next person who guessed the URL.
// ============================================================================

/** For responses that are the same for every caller and may be shared. */
export const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=300';
