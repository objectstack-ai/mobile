/**
 * Server probe — answers "is this an ObjectOS server, and which one?" before
 * the user connects.
 *
 * It reads three anonymous endpoints the platform serves for exactly this:
 *
 * - `GET /.well-known/objectstack` — discovery, enveloped as
 *   `{ success: true, data: { name, version, routes, … } }`. It alone decides
 *   whether the host is an ObjectOS server.
 * - `GET /api/v1/runtime/config` — a bare (not enveloped) body whose
 *   `branding` block carries `productName`, `logoUrl` and `brandColor`.
 * - `GET /api/v1/auth/config` — enveloped; `data.emailPassword`,
 *   `data.socialProviders` and `data.features.{sso, ssoEnforced}` describe
 *   how people sign in.
 *
 * Branding and sign-in methods are best-effort: a server that answers
 * discovery but not the other two is still an ObjectOS server, shown with its
 * initial on the default colour.
 *
 * The probe is anonymous — it sends no cookie and no credential (the shell
 * holds none) — and pure: the transport is injected. The app injects
 * {@link xhrFetch}, which keeps the native error text so a certificate failure
 * can be told apart from an unreachable host; React Native's `fetch` reports
 * both as the same `TypeError: Network request failed`.
 */
import { normalizeServerUrl, parseUrl, serverUrlAfterRedirect } from "~/lib/shell/console-url";

/** Where the platform serves its discovery document. */
export const DISCOVERY_PATH = "/.well-known/objectstack";
/** Branding and runtime flags for the Console (anonymous). */
export const RUNTIME_CONFIG_PATH = "/api/v1/runtime/config";
/** Public sign-in configuration (anonymous). */
export const AUTH_CONFIG_PATH = "/api/v1/auth/config";

/** Per-request timeout. */
export const PROBE_TIMEOUT_MS = 8000;

/**
 * Colour behind the initial when the server publishes no brand colour — the
 * platform's own default theme colour (`pwaThemeColor` in its runtime config).
 */
export const DEFAULT_BRAND_COLOR = "#4f46e5";

/** The slice of a fetch `Response` the probe reads. */
export interface ProbeResponse {
  ok: boolean;
  status: number;
  /** Final URL after redirects, when the transport reports it. */
  url?: string | null;
  text(): Promise<string>;
}

export interface ProbeRequestInit {
  method: "GET";
  headers: Record<string, string>;
  credentials: "omit";
  signal: AbortSignal;
}

/** A fetch-shaped transport. `globalThis.fetch` fits; the app uses {@link xhrFetch}. */
export type ProbeFetch = (url: string, init: ProbeRequestInit) => Promise<ProbeResponse>;

/** How people sign in to the server, from its public auth config. */
export interface SignInMethods {
  /** Email + password form offered (and not hidden by SSO-only mode). */
  emailPassword: boolean;
  /** Enterprise SSO usable. */
  sso: boolean;
  /** SSO-only mode: the password form is hidden. */
  ssoEnforced: boolean;
  /** Display names of the enabled social / OIDC providers. */
  providers: string[];
}

/** What the confirm screen shows about a server that answered discovery. */
export interface ProbedServer {
  /** Base URL to save — the redirected origin when the probe was redirected. */
  serverUrl: string;
  /** `https` — drives the lock row. */
  secure: boolean;
  /** `data.name` from discovery (`ObjectOS`). */
  platformName: string;
  /** `data.version` from discovery — the platform version. */
  version: string;
  /** Branded product name, or `null` when the server publishes none. */
  productName: string | null;
  /** Absolute logo URL, or `null`. */
  logoUrl: string | null;
  /** `#rgb` / `#rrggbb`, or `null`. */
  brandColor: string | null;
  /** Sign-in methods, or `null` when the auth config could not be read. */
  signIn: SignInMethods | null;
}

/**
 * Every outcome of a probe. Each failure kind has its own copy
 * (`serverConfig.error.<kind>` in the locales).
 */
export type ProbeResult =
  | { kind: "ok"; server: ProbedServer }
  /** Nothing was typed. */
  | { kind: "empty" }
  /** The input is not a server address. */
  | { kind: "invalid" }
  /** Plain http on a public host — typed, or reached through a redirect. */
  | { kind: "insecure-http" }
  /** No connection: DNS, refused, offline, VPN not up. */
  | { kind: "unreachable" }
  /** The TLS handshake failed — the certificate is invalid or untrusted. */
  | { kind: "tls" }
  /** No answer within {@link PROBE_TIMEOUT_MS}. */
  | { kind: "timeout" }
  /** Answered, but discovery is missing (4xx) or not ObjectOS's. */
  | { kind: "not-objectos" }
  /** Answered discovery with a 5xx. */
  | { kind: "server-error"; status: number };

export type ProbeFailureKind = Exclude<ProbeResult["kind"], "ok">;

export interface ProbeOptions {
  fetch: ProbeFetch;
  /** Allow plain http to public hosts (development builds). */
  allowInsecure?: boolean;
  timeoutMs?: number;
}

// Native TLS failure texts, as the platform networking stacks word them:
// iOS NSURLErrorDomain (-1200 … -1206, -2000 range) and Android OkHttp /
// Conscrypt (`javax.net.ssl.*`, `java.security.cert.*`, hostname mismatch).
const TLS_ERROR_RE =
  /\bssl\b|\btls\b|certificate|cert(path)?validator|trust anchor|handshake|hostname .* not verified|secure connection/i;

type Fetched =
  | { ok: true; res: ProbeResponse; body: string }
  | { ok: false; failure: "timeout" | "tls" | "unreachable" };

/** One GET with a timeout; transport failures are classified, never thrown. */
async function get(fetchFn: ProbeFetch, url: string, timeoutMs: number): Promise<Fetched> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const res = await fetchFn(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
      signal: controller.signal,
    });
    const body = await res.text();
    return { ok: true, res, body };
  } catch (err) {
    if (timedOut) return { ok: false, failure: "timeout" };
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, failure: TLS_ERROR_RE.test(message) ? "tls" : "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function nonEmptyString(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/** `data` of a `{ success: true, data }` envelope, or `null`. */
function envelopeData(body: string): Record<string, unknown> | null {
  const json = parseJson(body);
  if (!isRecord(json) || json.success !== true || !isRecord(json.data)) return null;
  return json.data;
}

/**
 * The discovery identity, or `null` when the body is not ObjectOS discovery.
 * Requires the fields `DiscoverySchema` makes mandatory and an ObjectOS server
 * always sends: `name`, `version` and the `routes` map.
 */
function readDiscovery(body: string): { name: string; version: string } | null {
  const data = envelopeData(body);
  if (!data || !isRecord(data.routes)) return null;
  const name = nonEmptyString(data.name);
  const version = nonEmptyString(data.version);
  return name && version ? { name, version } : null;
}

const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Absolute logo URL: absolute http(s) as is, root-relative against the origin. */
function absoluteLogoUrl(raw: string | null, serverUrl: string): string | null {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const server = parseUrl(serverUrl);
  if (!server) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return `${server.scheme}://${server.host}${raw}`;
  return null;
}

function readBranding(
  body: string,
  serverUrl: string
): Pick<ProbedServer, "productName" | "logoUrl" | "brandColor"> {
  const json = parseJson(body);
  const branding = isRecord(json) && isRecord(json.branding) ? json.branding : {};
  const color = nonEmptyString(branding.brandColor);
  return {
    productName: nonEmptyString(branding.productName),
    logoUrl: absoluteLogoUrl(nonEmptyString(branding.logoUrl), serverUrl),
    brandColor: color && HEX_COLOR_RE.test(color) ? color : null,
  };
}

function readSignIn(body: string): SignInMethods | null {
  const data = envelopeData(body);
  if (!data) return null;
  const features = isRecord(data.features) ? data.features : {};
  const ssoEnforced = features.ssoEnforced === true;
  const emailPassword = isRecord(data.emailPassword) && data.emailPassword.enabled === true;
  const providers = Array.isArray(data.socialProviders)
    ? data.socialProviders
        .filter((p): p is Record<string, unknown> => isRecord(p) && p.enabled !== false)
        .map((p) => nonEmptyString(p.name) ?? nonEmptyString(p.id))
        .filter((n): n is string => n !== null)
    : [];
  return {
    emailPassword: emailPassword && !ssoEnforced,
    sso: features.sso === true || ssoEnforced,
    ssoEnforced,
    providers,
  };
}

/**
 * Whether a redirect left the https rule behind: the probe ended on plain
 * http to a host the rule refuses.
 */
function redirectedToInsecure(finalUrl: string | null | undefined, allowInsecure: boolean): boolean {
  const final = finalUrl ? parseUrl(finalUrl) : null;
  if (!final || final.scheme !== "http") return false;
  const check = normalizeServerUrl(`http://${final.host}`, { allowInsecure });
  return !check.ok && check.reason === "insecure";
}

/**
 * Probe what the user typed. Normalizes it first (the https rule included),
 * then reads discovery, and — only for an ObjectOS server — branding and
 * sign-in methods. Never throws.
 */
export async function probeServer(input: string, opts: ProbeOptions): Promise<ProbeResult> {
  const allowInsecure = opts.allowInsecure ?? false;
  const timeoutMs = opts.timeoutMs ?? PROBE_TIMEOUT_MS;

  const normalized = normalizeServerUrl(input, { allowInsecure });
  if (!normalized.ok) {
    return { kind: normalized.reason === "insecure" ? "insecure-http" : normalized.reason };
  }

  const discoveryUrl = `${normalized.serverUrl}${DISCOVERY_PATH}`;
  const discovery = await get(opts.fetch, discoveryUrl, timeoutMs);
  if (!discovery.ok) return { kind: discovery.failure };
  const { res, body } = discovery;
  if (redirectedToInsecure(res.url, allowInsecure)) return { kind: "insecure-http" };
  if (res.status >= 500) return { kind: "server-error", status: res.status };
  if (!res.ok) return { kind: "not-objectos" };
  const identity = readDiscovery(body);
  if (!identity) return { kind: "not-objectos" };

  // A redirected probe (apex → www, http → https) yields the final origin, so
  // the shell's origin checks match what the WebView ends up on.
  const serverUrl = serverUrlAfterRedirect(normalized.serverUrl, discoveryUrl, res.url, {
    allowInsecure,
  });

  const [runtime, auth] = await Promise.all([
    get(opts.fetch, `${serverUrl}${RUNTIME_CONFIG_PATH}`, timeoutMs),
    get(opts.fetch, `${serverUrl}${AUTH_CONFIG_PATH}`, timeoutMs),
  ]);
  const branding =
    runtime.ok && runtime.res.ok
      ? readBranding(runtime.body, serverUrl)
      : { productName: null, logoUrl: null, brandColor: null };
  const signIn = auth.ok && auth.res.ok ? readSignIn(auth.body) : null;

  return {
    kind: "ok",
    server: {
      serverUrl,
      secure: serverUrl.startsWith("https://"),
      platformName: identity.name,
      version: identity.version,
      ...branding,
      signIn,
    },
  };
}

/** The name the confirm screen shows: the branded product name, else the platform's. */
export function displayName(server: ProbedServer): string {
  return server.productName ?? server.platformName;
}

/** First character of the display name, upper-cased — the logo fallback. */
export function serverInitial(server: ProbedServer): string {
  const first = Array.from(displayName(server).trim())[0];
  return first ? first.toLocaleUpperCase() : "?";
}

/**
 * A {@link ProbeFetch} over React Native's `XMLHttpRequest`.
 *
 * `fetch` in React Native (whatwg-fetch over XHR) rejects every transport
 * failure with `TypeError: Network request failed` and drops the native
 * reason. On failure RN's XHR keeps that reason in `responseText`, so this
 * transport rejects with it — which is what lets the probe say "certificate
 * invalid" instead of "unreachable". Cookies are not sent.
 */
export const xhrFetch: ProbeFetch = (url, init) =>
  new Promise<ProbeResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const readText = (): string => {
      try {
        return typeof xhr.responseText === "string" ? xhr.responseText : "";
      } catch {
        return "";
      }
    };
    const onAbort = () => xhr.abort();

    xhr.open(init.method, url, true);
    xhr.withCredentials = init.credentials !== "omit";
    for (const [name, value] of Object.entries(init.headers)) xhr.setRequestHeader(name, value);

    xhr.onload = () => {
      init.signal.removeEventListener("abort", onAbort);
      const text = readText();
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        url: xhr.responseURL || url,
        text: async () => text,
      });
    };
    xhr.onerror = () => {
      init.signal.removeEventListener("abort", onAbort);
      reject(new Error(readText() || "Network request failed"));
    };
    xhr.ontimeout = () => reject(new Error("Network request timed out"));
    xhr.onabort = () => {
      const err = new Error("Aborted");
      err.name = "AbortError";
      reject(err);
    };

    if (init.signal.aborted) {
      xhr.abort();
      return;
    }
    init.signal.addEventListener("abort", onAbort);
    xhr.send();
  });
