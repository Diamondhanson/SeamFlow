// ============================================================================
// Starting the audio clock — the web half.
//
// Called from the tap that is ABOUT to need audio: the mic button, a play
// button. Browsers only let a gesture start an AudioContext, and the gesture
// is spent the moment anything is awaited, so this has to happen first and
// synchronously — before the permission prompt, before the microphone opens.
// ============================================================================

export { unlockAudio } from './web-audio.web';
