/**
 * Saved connections — the organizations and company servers the user has
 * added, and which one is current.
 *
 * A connection is identified by its host: two saves of the same host are one
 * connection (the later save refreshes its label and branding). The list is
 * ordered by when each was first added; the switcher shows it in that order.
 *
 * Pure: no storage and no React. `lib/server-url.ts` persists the list,
 * `stores/server-store.ts` publishes it, and removal's sign-out lives in
 * `./sign-out.ts`.
 */
import { normalizeServerUrl, parseUrl, safeConsoleRoute } from "~/lib/shell/console-url";
import {
  DEFAULT_BRAND_COLOR,
  displayName,
  serverInitial,
  type ProbedServer,
} from "~/lib/server-probe";

/**
 * `cloud`: an ObjectOS Cloud organization, opening its single production
 * environment. `server`: a company's own server (shown as "Private").
 */
export const CONNECTION_KINDS = ["cloud", "server"] as const;
export type ConnectionKind = (typeof CONNECTION_KINDS)[number];

export interface Connection {
  kind: ConnectionKind;
  /** The organization name (cloud), or the server's branded product name (server). */
  label: string;
  /**
   * `host[:port]` of `serverUrl` — lower-cased, the scheme's default port
   * dropped (`parseUrl`). A connection's identity: saves are deduplicated by it.
   */
  host: string;
  /** The normalized server base URL the Console is loaded from (`<serverUrl>/_console`). */
  serverUrl: string;
  /** `#rgb` / `#rrggbb` behind the initial. */
  brandColor: string;
  /** The character shown on the brand colour. */
  initial: string;
  /** The last Console route the user was on here, where a switch back starts; `null` before any. */
  lastRoute: string | null;
  /** When the connection was first added (epoch ms). */
  addedAt: number;
  /**
   * The managed address (MDM, `lib/managed-config/`) this connection was
   * confirmed from, normalized — kept because the probe may adopt a redirect,
   * so `serverUrl` can differ from it. Absent on connections the user added.
   */
  managedFrom?: string;
}

export interface Connections {
  /** Ordered by when each connection was first added. */
  list: readonly Connection[];
  /** Host of the current connection, or `null` when there is none. */
  current: string | null;
  /**
   * Hosts removed while their push token may still be registered there: the
   * Console was not loaded, or did not confirm it unregistered the token. A
   * later save of the host drops it from here.
   */
  pushLeftRegistered: readonly string[];
}

export const EMPTY_CONNECTIONS: Connections = { list: [], current: null, pushLeftRegistered: [] };

/** What a save supplies; the host, route and date are the list's to keep. */
export interface ConnectionInput {
  kind: ConnectionKind;
  label: string;
  serverUrl: string;
  brandColor: string;
  initial: string;
  /** Set when the connection is saved from the managed address. */
  managedFrom?: string;
}

const BRAND_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** The host a server URL is saved under, or `null` when it is not an absolute URL. */
export function hostOf(serverUrl: string): string | null {
  return parseUrl(serverUrl)?.host ?? null;
}

/** The first character of `text`, upper-cased — the logo fallback. */
function initialOf(text: string): string {
  const first = Array.from(text.trim())[0];
  return first ? first.toLocaleUpperCase() : "?";
}

/** A company server the user confirmed on the picker's confirm step. */
export function connectionFromProbe(server: ProbedServer): ConnectionInput {
  return {
    kind: "server",
    label: displayName(server),
    serverUrl: server.serverUrl,
    brandColor: server.brandColor ?? DEFAULT_BRAND_COLOR,
    initial: serverInitial(server),
  };
}

/**
 * The single server URL a build before saved connections stored, as a
 * connection: kind `server`, labelled with its host (that build kept no
 * branding). `null` when the stored value is not a server URL.
 */
export function connectionFromLegacyUrl(value: string): ConnectionInput | null {
  const normalized = normalizeServerUrl(value, { allowInsecure: true });
  if (!normalized.ok) return null;
  const host = hostOf(normalized.serverUrl);
  if (!host) return null;
  return {
    kind: "server",
    label: host,
    serverUrl: normalized.serverUrl,
    brandColor: DEFAULT_BRAND_COLOR,
    initial: initialOf(host),
  };
}

export function currentConnection(state: Connections): Connection | null {
  return state.list.find((c) => c.host === state.current) ?? null;
}

/**
 * Save a connection and make it current. A host already in the list keeps its
 * place and `addedAt`; its label, branding and URL are refreshed, and its last
 * route is kept unless the server URL changed, and its `managedFrom` unless the
 * save sets one. A save also drops the host from
 * {@link Connections.pushLeftRegistered}.
 */
export function addConnection(state: Connections, input: ConnectionInput, now: number): Connections {
  const host = hostOf(input.serverUrl);
  if (!host) return state;
  const index = state.list.findIndex((c) => c.host === host);
  const list = state.list.slice();
  if (index === -1) {
    list.push({ ...input, host, lastRoute: null, addedAt: now });
  } else {
    const existing = list[index];
    list[index] = {
      ...existing,
      ...input,
      host,
      lastRoute: existing.serverUrl === input.serverUrl ? existing.lastRoute : null,
    };
  }
  return {
    list,
    current: host,
    pushLeftRegistered: state.pushLeftRegistered.filter((h) => h !== host),
  };
}

/** Make `host` current. A host that is not saved changes nothing. */
export function selectConnection(state: Connections, host: string): Connections {
  if (state.current === host || !state.list.some((c) => c.host === host)) return state;
  return { ...state, current: host };
}

/**
 * Remove `host`. Removing the current connection makes the first remaining one
 * current (none left: no current connection); removing another leaves the
 * current one as it is. With `pushLeftRegistered`, the host is recorded in
 * {@link Connections.pushLeftRegistered}.
 */
export function removeConnection(
  state: Connections,
  host: string,
  opts: { pushLeftRegistered?: boolean } = {}
): Connections {
  if (!state.list.some((c) => c.host === host)) return state;
  const list = state.list.filter((c) => c.host !== host);
  const current = state.current === host ? (list[0]?.host ?? null) : state.current;
  const pushLeftRegistered =
    opts.pushLeftRegistered && !state.pushLeftRegistered.includes(host)
      ? [...state.pushLeftRegistered, host]
      : state.pushLeftRegistered;
  return { list, current, pushLeftRegistered };
}

/** Record the Console route the user is on at `host`. An unsafe route changes nothing. */
export function rememberRoute(state: Connections, host: string, route: string): Connections {
  const safe = safeConsoleRoute(route);
  if (safe === null) return state;
  const index = state.list.findIndex((c) => c.host === host);
  if (index === -1 || state.list[index].lastRoute === safe) return state;
  const list = state.list.slice();
  list[index] = { ...list[index], lastRoute: safe };
  return { ...state, list };
}

// ── Storage form ────────────────────────────────────────────────────────────

/** Version of the stored document; a document of another version is not read. */
export const CONNECTIONS_STORAGE_VERSION = 1;

interface StoredConnections {
  version: number;
  current: string | null;
  connections: Connection[];
  pushLeftRegistered: string[];
}

export function serializeConnections(state: Connections): string {
  const stored: StoredConnections = {
    version: CONNECTIONS_STORAGE_VERSION,
    current: state.current,
    connections: state.list.slice(),
    pushLeftRegistered: state.pushLeftRegistered.slice(),
  };
  return JSON.stringify(stored);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** One stored record, re-checked field by field; `null` drops it. */
function parseConnection(raw: unknown): Connection | null {
  if (!isRecord(raw)) return null;
  const { kind, label, serverUrl, brandColor, initial, lastRoute, addedAt, managedFrom } = raw;
  if (typeof kind !== "string" || !(CONNECTION_KINDS as readonly string[]).includes(kind)) {
    return null;
  }
  if (typeof serverUrl !== "string") return null;
  const normalized = normalizeServerUrl(serverUrl, { allowInsecure: true });
  if (!normalized.ok || normalized.serverUrl !== serverUrl) return null;
  const host = hostOf(serverUrl);
  if (!host) return null;
  const name = typeof label === "string" && label.trim().length > 0 ? label : host;
  return {
    kind: kind as ConnectionKind,
    label: name,
    host,
    serverUrl,
    brandColor:
      typeof brandColor === "string" && BRAND_COLOR_RE.test(brandColor)
        ? brandColor
        : DEFAULT_BRAND_COLOR,
    initial:
      typeof initial === "string" && initial.trim().length > 0 ? initial : initialOf(name),
    lastRoute: safeConsoleRoute(lastRoute),
    addedAt: typeof addedAt === "number" && Number.isFinite(addedAt) ? addedAt : 0,
    ...(typeof managedFrom === "string" && managedFrom.length > 0 ? { managedFrom } : {}),
  };
}

/**
 * Read a stored document. Records that do not check out are dropped (and a
 * second record for a host already read); a current host that is not in the
 * list falls back to the first connection. `null` when the text is not a
 * stored document of this version at all.
 */
export function parseConnections(text: string): Connections | null {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(doc) || doc.version !== CONNECTIONS_STORAGE_VERSION) return null;
  if (!Array.isArray(doc.connections)) return null;

  const list: Connection[] = [];
  for (const raw of doc.connections) {
    const connection = parseConnection(raw);
    if (connection && !list.some((c) => c.host === connection.host)) list.push(connection);
  }
  const current =
    typeof doc.current === "string" && list.some((c) => c.host === doc.current)
      ? doc.current
      : (list[0]?.host ?? null);
  const pushLeftRegistered = Array.isArray(doc.pushLeftRegistered)
    ? Array.from(
        new Set(doc.pushLeftRegistered.filter((h): h is string => typeof h === "string"))
      )
    : [];
  return { list, current, pushLeftRegistered };
}
