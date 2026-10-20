// ============================================================================
// Starting the audio clock — the native half, which has no clock to start.
//
// iOS and Android open their audio session when the recorder or the player
// asks for one, and there is no gesture requirement to satisfy. The web half
// is the one that matters; see lib/audio-unlock.web and lib/web-audio.web.
//
// This exists as its own tiny module, rather than as a branch inside the audio
// engine, so that nothing in the native bundle ever imports the web one.
// ============================================================================

export function unlockAudio(): void {}
