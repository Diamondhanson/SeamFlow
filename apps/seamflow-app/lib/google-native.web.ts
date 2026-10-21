// Web stub for the native Google Sign-In wrapper (see google-native.ts).
//
// The web build keeps using the browser OAuth flow, so the native account
// picker is never invoked here — and, crucially, the native module is never
// pulled into the web bundle. Metro picks this file for the web platform.

export class GoogleCancelled extends Error {
  constructor() {
    super('google-sign-in-cancelled');
    this.name = 'GoogleCancelled';
  }
}

export async function nativeGoogleIdToken(_webClientId: string): Promise<string> {
  throw new Error('Native Google Sign-In is not available on web');
}
