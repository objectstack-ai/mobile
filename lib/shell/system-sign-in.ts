/**
 * System sign-in: a sign-in an identity provider refuses to run in an embedded
 * WebView (Google answers `disallowed_useragent`) runs in the operating
 * system's auth session instead, and its session is handed back to the WebView
 * once, through the server's one-time-token hand-off.
 *
 *   1. The shell makes an RFC 7636 `code_verifier` and keeps it in memory.
 *   2. It opens the Console's sign-in page in the auth session
 *      (`ASWebAuthenticationSession`, Custom Tabs), with the hand-off as the
 *      page's `redirect`: {@link signInEntryUrl}.
 *   3. After the sign-in the Console navigates to the hand-off, which answers
 *      `302 ai.objectos.mobile://auth/callback?token=T`. The token is stored
 *      under a key bound to the verifier's S256 challenge.
 *   4. The shell redeems `T.code_verifier` from inside the WebView, on the
 *      server's origin ({@link buildRedeemScript}), so the session cookie lands
 *      in the WebView's store. The shell holds no credential afterwards.
 *
 * An app that intercepts the callback holds `T` alone and cannot redeem it: the
 * server answers `400 Invalid token` and the real holder can still redeem.
 * The verifier never leaves the device except in that redemption. A replay is
 * refused by the server: the token is single-use and lasts one minute. The
 * server's half is objectstack `one-time-token-handoff.ts`.
 *
 * Everything here is pure, or takes what it touches as an argument. The
 * component feeds it and acts on the outcome.
 */
import { CONSOLE_BASE_PATH, consoleUrl, originOf, parseUrl } from "./console-url";
import { SIGN_IN_ROUTE } from "./navigation-policy";
import { toScriptLiteral } from "./bridge/scripts";

/**
 * The URL scheme the hand-off redirects to. A deployment registers this value in
 * `AuthConfig.trustedAppSchemes`, which accepts only a reverse-domain private-use
 * scheme (RFC 8252 §7.1), so the app's short link scheme (`objectos`) cannot be
 * it. It is the app's identifier; `app.config.ts` registers it with the OS.
 */
export const HANDOFF_APP_SCHEME = "ai.objectos.mobile";

/** The hand-off route, under the server's base path. */
export const HANDOFF_PATH = "/api/v1/auth/one-time-token/handoff";

/** The redemption route (the auth library's own), under the server's base path. */
export const VERIFY_PATH = "/api/v1/auth/one-time-token/verify";

const CALLBACK_HOST = "auth";
const CALLBACK_PATH = "/callback";

/** Where the hand-off sends the token. */
export const HANDOFF_CALLBACK_URL = `${HANDOFF_APP_SCHEME}://${CALLBACK_HOST}${CALLBACK_PATH}`;

/** How many random bytes make a verifier: 32 is RFC 7636 §4.1's recommendation, 43 characters. */
export const CODE_VERIFIER_BYTES = 32;

/**
 * The `error` code a failed redemption sends the Console's sign-in page. The
 * page shows its own "single sign-on could not be completed" banner for any
 * callback error.
 */
export const HANDOFF_FAILED_ERROR = "handoff_failed";

/** The hand-off's token alphabet (the auth library's generator). */
const TOKEN_RE = /^[A-Za-z0-9_-]+$/;

/** An S256 challenge no verifier was kept for: {@link probeHandoffOffered} never redeems. */
const PROBE_CHALLENGE = "A".repeat(43);

const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Unpadded base64url (RFC 4648 §5). */
export function base64Url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += BASE64URL[a >> 2];
    out += BASE64URL[((a & 3) << 4) | (b >> 4)];
    if (i + 1 < bytes.length) out += BASE64URL[((b & 15) << 2) | (c >> 6)];
    if (i + 2 < bytes.length) out += BASE64URL[c & 63];
  }
  return out;
}

/** RFC 7636 §4.2 S256, from a base64 SHA-256 digest of the verifier's ASCII bytes. */
export function challengeFromBase64Digest(digest: string): string {
  return digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The hand-off's path and query, as the Console's `redirect` carries it. */
export function handoffTarget(serverUrl: string, challenge: string): string | null {
  const server = parseUrl(serverUrl);
  if (!server) return null;
  const base = server.path === "/" ? "" : server.path;
  return (
    `${base}${HANDOFF_PATH}?redirect_uri=${encodeURIComponent(HANDOFF_CALLBACK_URL)}` +
    `&code_challenge=${challenge}&code_challenge_method=S256`
  );
}

/** What the auth session opens: the Console's sign-in page, going to the hand-off afterwards. */
export function signInEntryUrl(serverUrl: string, challenge: string): string | null {
  const target = handoffTarget(serverUrl, challenge);
  if (target === null) return null;
  return consoleUrl(serverUrl, `${SIGN_IN_ROUTE}?redirect=${encodeURIComponent(target)}`);
}

/** Whether `link` is the hand-off's callback, whatever it carries. */
export function isHandoffCallback(link: string): boolean {
  const target = parseUrl(link);
  return (
    target !== null &&
    target.scheme === HANDOFF_APP_SCHEME &&
    target.host === CALLBACK_HOST &&
    target.path === CALLBACK_PATH
  );
}

/**
 * The token a hand-off callback carries, or `null` for anything else: another
 * link, a repeated `token`, an extra parameter, or a value outside the token's
 * alphabet. The callback has one shape, so a link with more is refused.
 */
export function tokenFromCallback(link: string): string | null {
  if (!isHandoffCallback(link)) return null;
  const query = link.split("#")[0].split("?")[1];
  if (!query) return null;
  const pairs = query.split("&");
  if (pairs.length !== 1 || !pairs[0].startsWith("token=")) return null;
  const token = pairs[0].slice("token=".length);
  return TOKEN_RE.test(token) ? token : null;
}

/**
 * The script that redeems the token in the WebView. It runs only on the
 * server's origin, so a verifier is never sent anywhere else, and it moves the
 * page either way: to the Console's start with the new session, or back to the
 * sign-in page with {@link HANDOFF_FAILED_ERROR}.
 */
export function buildRedeemScript(
  serverUrl: string,
  token: string,
  codeVerifier: string
): string | null {
  const origin = originOf(serverUrl);
  const server = parseUrl(serverUrl);
  if (origin === null || !server) return null;
  const base = server.path === "/" ? "" : server.path;
  const home = `${base}${CONSOLE_BASE_PATH}/`;
  const failed = `${base}${CONSOLE_BASE_PATH}${SIGN_IN_ROUTE}?error=${HANDOFF_FAILED_ERROR}`;
  return `(function () {
  if (location.origin !== ${toScriptLiteral(origin)}) return;
  var failed = ${toScriptLiteral(failed)};
  fetch(${toScriptLiteral(`${base}${VERIFY_PATH}`)}, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: ${toScriptLiteral(JSON.stringify({ token: `${token}.${codeVerifier}` }))}
  }).then(
    function (response) { location.replace(response.ok ? ${toScriptLiteral(home)} : failed); },
    function () { location.replace(failed); }
  );
})();
true;`;
}

/** The slice of the probe's fetch transport this reads. */
export type HandoffProbeFetch = (
  url: string,
  init: { method: "GET"; headers: Record<string, string>; credentials: "omit"; signal: AbortSignal }
) => Promise<{ status: number }>;

/**
 * Whether the server hands a sign-in to this app, asked anonymously so nobody
 * is sent into a sign-in that cannot come back. The route checks the scheme
 * before the session, so `401` means "registered, sign in first". `404` is a
 * server without the route, `400` a server that has not registered this app.
 */
export async function probeHandoffOffered(
  serverUrl: string,
  fetchFn: HandoffProbeFetch,
  timeoutMs = 8000
): Promise<boolean> {
  const target = handoffTarget(serverUrl, PROBE_CHALLENGE);
  const server = parseUrl(serverUrl);
  if (target === null || !server) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(`${server.scheme}://${server.host}${target}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
      signal: controller.signal,
    });
    return response.status === 401;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** What the app's auth session answers, as `openAuthSessionAsync` reports it. */
export type AuthSessionResult = { type: "success"; url: string } | { type: string };

export interface SystemSignInDeps {
  /** {@link probeHandoffOffered}, on this server. */
  offered: () => Promise<boolean>;
  randomBytes: (count: number) => Uint8Array;
  /** Base64 SHA-256 of a string's bytes. */
  sha256Base64: (value: string) => Promise<string>;
  openAuthSession: (url: string, callbackUrl: string) => Promise<AuthSessionResult>;
}

export type SystemSignInOutcome =
  /** The token and the verifier that redeems it. Neither is ever logged. */
  | { kind: "signed-in"; token: string; codeVerifier: string }
  /** The user closed the auth session. */
  | { kind: "cancelled" }
  /** This server does not hand sign-ins to this app. */
  | { kind: "not-offered" }
  /** The auth session failed, or came back with something other than a token. */
  | { kind: "failed" };

/** Run the auth session, from the probe to the callback. Never rejects. */
export async function runSystemSignIn(
  serverUrl: string,
  deps: SystemSignInDeps
): Promise<SystemSignInOutcome> {
  try {
    if (!(await deps.offered())) return { kind: "not-offered" };
    const codeVerifier = base64Url(deps.randomBytes(CODE_VERIFIER_BYTES));
    const challenge = challengeFromBase64Digest(await deps.sha256Base64(codeVerifier));
    const entry = signInEntryUrl(serverUrl, challenge);
    if (entry === null) return { kind: "failed" };
    const result = await deps.openAuthSession(entry, HANDOFF_CALLBACK_URL);
    if (result.type !== "success" || !("url" in result)) return { kind: "cancelled" };
    const token = tokenFromCallback(result.url);
    return token === null ? { kind: "failed" } : { kind: "signed-in", token, codeVerifier };
  } catch {
    return { kind: "failed" };
  }
}
