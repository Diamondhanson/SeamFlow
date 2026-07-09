import * as WebBrowser from 'expo-web-browser';
import { config } from './config';

export type LegalPage = 'privacy' | 'terms';

/**
 * Open a hosted legal page (Privacy / Terms) in an in-app browser
 * (SFSafariViewController / Chrome Custom Tabs), in the user's current
 * language. Errors are swallowed — a policy link should never crash a screen.
 */
export async function openLegal(page: LegalPage, language: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(`${config.webUrl}/${page}?lang=${language}`);
  } catch {
    // no-op
  }
}
