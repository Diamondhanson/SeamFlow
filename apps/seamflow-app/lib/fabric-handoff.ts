// ============================================================================
// Handing a just-created fabric back to the screen that asked for it.
//
// The flow this exists for: a tailor is attaching fabric to an order, realises
// the roll they just bought isn't in the library yet, taps "New fabric", fills
// the form — and expects to land back on the order with that fabric already
// chosen. Making them re-open the picker and hunt for what they just typed is
// the kind of small indignity that makes an app feel unfinished.
//
// expo-router has no "return a value from the pushed screen" API, so this is a
// one-slot mailbox instead. Deliberately not a query cache entry or context:
// it is a single id that survives exactly one navigation and is consumed once.
//
// Consumers must claim() before pushing, so that when several fabric pickers
// exist (order detail, the new-order wizard, the group form), only the one the
// tailor actually tapped takes delivery.
// ============================================================================

let pendingFabricId: string | null = null;
let claimant: symbol | null = null;

/** Called by a picker just before it pushes the create-fabric screen. */
export function claimFabricHandoff(token: symbol): void {
  claimant = token;
  pendingFabricId = null;
}

/** Called by the create-fabric screen once the fabric exists. */
export function deliverFabric(fabricId: string): void {
  // No claimant means the tailor reached the form from the Fabrics library on
  // their own. Nothing is waiting, so drop it rather than surprising the next
  // picker that happens to mount.
  if (!claimant) return;
  pendingFabricId = fabricId;
}

/** Returns the id once, to the picker that claimed the handoff. */
export function takeFabric(token: symbol): string | null {
  if (claimant !== token || !pendingFabricId) return null;
  const id = pendingFabricId;
  pendingFabricId = null;
  claimant = null;
  return id;
}

/** Abandon a claim — the picker unmounted, or the tailor backed out. */
export function releaseFabricHandoff(token: symbol): void {
  if (claimant !== token) return;
  claimant = null;
  pendingFabricId = null;
}
