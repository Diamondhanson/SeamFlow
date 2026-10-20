// ============================================================================
// Reading a waveform back out of a finished recording — the native half.
//
// Native does not need this: expo-audio meters the microphone directly while
// recording and the levels are already in hand by the time it stops. Returning
// null tells the caller to keep the ones it captured.
//
// Metro picks the `.web` file on web and this one everywhere else.
// ============================================================================

export async function waveformFromRecording(_uri: string): Promise<number[] | null> {
  return null;
}
