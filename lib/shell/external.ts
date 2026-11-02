/**
 * Opening URLs outside the WebView: web pages in the in-app browser
 * (SFSafariViewController / Custom Tabs), everything else (mailto:, tel:,
 * app schemes) through the OS.
 */
import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

export async function openExternalUrl(url: string): Promise<void> {
  try {
    if (/^https?:/i.test(url)) {
      await WebBrowser.openBrowserAsync(url);
      return;
    }
    await Linking.openURL(url);
  } catch {
    // No handler for the scheme, or the browser could not open — nothing the
    // user can act on beyond the link simply not opening.
  }
}
