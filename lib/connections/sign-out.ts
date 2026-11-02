/**
 * Removing a saved connection signs it out: the Console unregisters this
 * install's push token when it can, and the host's own cookies are cleared.
 * The shell calls no API itself — unregistering is the Console's, under its
 * own session.
 */
import { addBreadcrumb } from "~/lib/sentry";
import type { CookieClearOutcome } from "./cookies";
import type { Connection } from "./model";

/**
 * What the Console answered when asked to unregister its push token before
 * its connection is removed (`objectstack-native:connectionRemoved`).
 */
export type ConsoleRemovalAnswer =
  /** A listener took the event, and everything it handed `waitUntil` resolved. */
  | "unregistered"
  /** A listener took the event, but something it handed `waitUntil` rejected. */
  | "failed"
  /** No listener took the event (a Console older than it). */
  | "not-handled"
  /** No Console to ask: another connection's, the failure page, or not ready yet. */
  | "not-loaded"
  /** No answer in time, or the WebView was replaced while waiting. */
  | "no-answer";

export interface SignOutOutcome {
  host: string;
  consoleAnswer: ConsoleRemovalAnswer;
  /** `left-registered` unless the Console confirmed it unregistered the token. */
  pushToken: "unregistered" | "left-registered";
  cookies: CookieClearOutcome;
}

export interface SignOutDeps {
  /** Ask the loaded Console to unregister its push token. Called only for the current connection. */
  askConsole: () => Promise<ConsoleRemovalAnswer>;
  /** Drop the connection from the saved list, recording a push token left registered. */
  remove: (host: string, opts: { pushLeftRegistered: boolean }) => Promise<void>;
  /** Server URLs of the connections still saved. Read after the removal. */
  remaining: () => readonly string[];
  /** Clear the host's own cookies, leaving the remaining connections' alone. */
  clearCookies: (serverUrl: string, others: readonly string[]) => Promise<CookieClearOutcome>;
}

/**
 * Remove `connection` and sign it out, in this order:
 *
 * 1. Only when it is the current connection: its Console (if loaded and
 *    ready) is asked to unregister this install's push token — first, while
 *    the session cookie it needs is still there.
 * 2. It leaves the saved list. A current connection hands over to the next
 *    one, which re-creates the WebView on that host (or, with none left, the
 *    Console screen gives way to the picker), so no page of the removed host
 *    is left to set its cookies again.
 * 3. The host's own cookies are cleared.
 *
 * Any answer but `unregistered` records the push token as left registered.
 */
export async function removeAndSignOut(
  connection: Connection,
  isCurrent: boolean,
  deps: SignOutDeps
): Promise<SignOutOutcome> {
  const consoleAnswer: ConsoleRemovalAnswer = isCurrent ? await deps.askConsole() : "not-loaded";
  const pushToken = consoleAnswer === "unregistered" ? "unregistered" : "left-registered";
  await deps.remove(connection.host, { pushLeftRegistered: pushToken === "left-registered" });
  const cookies = await deps.clearCookies(connection.serverUrl, deps.remaining());
  const outcome: SignOutOutcome = { host: connection.host, consoleAnswer, pushToken, cookies };
  addBreadcrumb({
    category: "connections",
    message: "connection removed",
    data: { host: outcome.host, consoleAnswer, pushToken, cookies: cookies.kind },
  });
  return outcome;
}
