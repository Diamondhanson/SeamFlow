// ============================================================================
// One sound at a time.
//
// A thread can hold a dozen voice notes, each with its own player. Without a
// referee, tapping a second one while the first is still going plays both at
// once — which is not a minor annoyance but genuinely unintelligible, and the
// fastest way to make someone distrust the feature.
//
// So playback is a single piece of shared state: starting anything stops
// whatever was running. Deliberately module-level rather than a React context,
// because the bubbles that need it are rendered by a FlatList and may be
// unmounted and remounted while the thing they started is still playing.
// ============================================================================

interface Holder {
  id: string;
  stop: () => void;
}

let current: Holder | null = null;

/**
 * Claim playback for `id`, stopping whoever had it.
 *
 * `stop` is called on the previous holder only — re-claiming with the same id
 * (a seek, a resume) leaves it playing.
 */
export function takeAudioFocus(id: string, stop: () => void): void {
  if (current && current.id !== id) {
    const previous = current;
    current = null;
    previous.stop();
  }
  current = { id, stop };
}

/** Give it up, if we still hold it. */
export function releaseAudioFocus(id: string): void {
  if (current?.id === id) current = null;
}

/**
 * Stop whatever is playing, from outside.
 *
 * Called when a thread closes: audio that follows you out of the screen that
 * started it is a bug in every app that has ever shipped it.
 */
export function stopAllAudio(): void {
  const holder = current;
  current = null;
  holder?.stop();
}
