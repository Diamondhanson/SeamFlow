// ============================================================================
// Unlocking the browser's audio clock — the native no-op half.
//
// There is nothing to unlock on a phone: iOS and Android hand the recorder a
// live signal as soon as it starts. This file exists so that `audio-unlock.web`
// can exist, and so the native bundle never pulls in a web-only module.
//
// Metro picks the `.web` file on web and this one everywhere else.
// ============================================================================

export async function warmUpAudioMetering(): Promise<void> {
  // Nothing to do off the web.
}
