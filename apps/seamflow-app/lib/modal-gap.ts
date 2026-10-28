// ============================================================================
// Let a modal finish closing before another one opens.
//
// On an iPhone a second modal cannot be shown while a first is on screen or still
// animating away: the second simply never appears. Every dialog in the app is a
// modal, and so is the full-screen "Reading…" overlay shown during a scan. A
// handler that raised a dialog while that overlay was up therefore waited forever
// on a dialog nobody could see — and the overlay, which only comes down after the
// handler finishes, stayed up too. From the outside that is a frozen app: nothing
// can be tapped and nothing explains why.
//
// The rule for any code that shows a modal and then a dialog: take the first one
// down, `await settleModals()`, THEN ask.
// ============================================================================

/** Long enough for a modal's fade/slide to complete, short enough to feel instant. */
export const MODAL_SETTLE_MS = 420;

export const settleModals = (ms: number = MODAL_SETTLE_MS): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
