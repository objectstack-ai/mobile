/**
 * {@link runSystemSignIn} with the app's real transports: the probe's XHR, the
 * platform's random source and digest, and the operating system's auth session.
 *
 * The session is ephemeral where the platform offers it (iOS). The hand-off
 * carries only a session signed in within the last five minutes, so a browser
 * session from earlier is no use, and an ephemeral one asks for no consent
 * prompt. Android's Custom Tabs have no such mode through expo-web-browser.
 */
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { xhrFetch } from "~/lib/server-probe";
import { probeHandoffOffered, runSystemSignIn, type SystemSignInOutcome } from "./system-sign-in";

export function openSystemSignIn(serverUrl: string): Promise<SystemSignInOutcome> {
  return runSystemSignIn(serverUrl, {
    offered: () => probeHandoffOffered(serverUrl, xhrFetch),
    randomBytes: (count) => Crypto.getRandomBytes(count),
    sha256Base64: (value) =>
      Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value, {
        encoding: Crypto.CryptoEncoding.BASE64,
      }),
    openAuthSession: (url, callbackUrl) =>
      WebBrowser.openAuthSessionAsync(url, callbackUrl, { preferEphemeralSession: true }),
  });
}
