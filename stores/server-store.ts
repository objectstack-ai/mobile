import { create } from "zustand";
import {
  EMPTY_CONNECTIONS,
  addConnection,
  connectionFromProbe,
  currentConnection,
  hostOf,
  rememberRoute,
  removeConnection,
  selectConnection,
  type Connection,
  type Connections,
} from "~/lib/connections/model";
import {
  NO_MANAGED_CONFIG,
  findManagedConnection,
  isLocked,
  lockedHost,
  managedServerKey,
  sameManagedConfig,
  type ManagedConfig,
} from "~/lib/managed-config/model";
import { readManagedConfig, subscribeManagedConfig } from "~/lib/managed-config/native";
import { loadConnections, saveConnections } from "~/lib/server-url";
import type { ProbedServer } from "~/lib/server-probe";
import { addBreadcrumb } from "~/lib/sentry";

interface ServerState {
  /** The saved connections, in the order they were added. */
  connections: readonly Connection[];
  /** Host of the current connection, or `null`. */
  currentHost: string | null;
  /** Hosts removed while their push token may still be registered there. */
  pushLeftRegistered: readonly string[];
  /** The current connection's server base URL, or `null` if there is none. */
  serverUrl: string | null;
  /** True once the persisted connections have been read on startup. */
  isReady: boolean;
  /** The MDM managed config (`lib/managed-config/`), as last read. */
  managed: ManagedConfig;
  /**
   * The managed address the user declined this session (its normalized key),
   * to enter another one. Only while unlocked; not persisted.
   */
  managedDeclined: string | null;
  /**
   * Load the persisted connections (migrating a single saved URL) and the
   * managed config, and start following managed config changes.
   */
  hydrate: () => Promise<void>;
  /**
   * Save the server the user confirmed and make it current. Persisted before
   * it is published; throws when storage refuses it. `managedFrom`: the server
   * was confirmed from the managed address.
   */
  connect: (server: ProbedServer, opts?: { managedFrom?: string }) => Promise<void>;
  /**
   * Take a new reading of the managed config. An unchanged one does nothing;
   * a changed one is published, and its saved connection made current.
   */
  applyManaged: (config: ManagedConfig) => void;
  /** Decline the managed address for this session (unlocked only). */
  declineManaged: () => void;
  /** Make a saved connection current. */
  select: (host: string) => Promise<void>;
  /**
   * Drop a saved connection from the list (the next one becomes current when
   * it was). Signing it out is `lib/connections/sign-out.ts`.
   */
  remove: (host: string, opts?: { pushLeftRegistered?: boolean }) => Promise<void>;
  /** Record the Console route the user is on, on the server it belongs to. */
  rememberRoute: (serverUrl: string, route: string) => void;
  /**
   * Forget the current connection (the bridge's `resetServer`). Throws when
   * it is the managed connection and the server is locked.
   */
  reset: () => Promise<void>;
}

/** The message `reset` throws for a locked connection (it reaches the Console as `failed`). */
export const LOCKED_SERVER_MESSAGE = "The server is locked by the organization's device management";

function connectionsOf(s: ServerState): Connections {
  return { list: s.connections, current: s.currentHost, pushLeftRegistered: s.pushLeftRegistered };
}

function published(c: Connections): Partial<ServerState> {
  return {
    connections: c.list,
    currentHost: c.current,
    pushLeftRegistered: c.pushLeftRegistered,
    serverUrl: currentConnection(c)?.serverUrl ?? null,
  };
}

/**
 * Writes run one at a time, in the order the changes were made, each with the
 * whole list as it was after its change — so the last write is the latest
 * state.
 */
let writes: Promise<void> = Promise.resolve();
function persist(c: Connections): Promise<void> {
  const write = writes.then(() => saveConnections(c));
  writes = write.catch(() => undefined);
  return write;
}

/** A write whose failure the user cannot act on: the next change rewrites the list. */
function persistQuietly(c: Connections): Promise<void> {
  return persist(c).catch((err: unknown) => {
    addBreadcrumb({
      category: "connections",
      message: "saving connections failed",
      data: { error: err instanceof Error ? err.message : String(err) },
    });
  });
}

/**
 * Managed config wins over the stored current connection: when a saved
 * connection came from the managed address, it becomes current.
 */
function preferManaged(c: Connections, managed: ManagedConfig): Connections {
  const host = findManagedConnection(c.list, managed)?.host;
  return host ? selectConnection(c, host) : c;
}

/** Following managed config changes, once started by the first hydrate. */
let stopFollowingManaged: (() => void) | null = null;

/**
 * Reactive source of truth for the saved connections and the current one.
 *
 * `lib/server-url.ts` owns persistence; this store mirrors it in memory so the
 * start screen, the switcher and the Console screen re-render the moment the
 * user connects, switches or removes. The shell holds no API client — the
 * Console talks to the server.
 */
export const useServerStore = create<ServerState>((set, get) => ({
  connections: EMPTY_CONNECTIONS.list,
  currentHost: EMPTY_CONNECTIONS.current,
  pushLeftRegistered: EMPTY_CONNECTIONS.pushLeftRegistered,
  serverUrl: null,
  isReady: false,
  managed: NO_MANAGED_CONFIG,
  managedDeclined: null,
  hydrate: async () => {
    const managed = readManagedConfig();
    const loaded = await loadConnections();
    const next = preferManaged(loaded, managed);
    set({ ...published(next), managed, isReady: true });
    if (next.current !== loaded.current) await persistQuietly(next);
    if (!stopFollowingManaged) {
      stopFollowingManaged = subscribeManagedConfig((config) => get().applyManaged(config));
    }
  },
  connect: async (server, opts) => {
    const input = {
      ...connectionFromProbe(server),
      ...(opts?.managedFrom ? { managedFrom: opts.managedFrom } : {}),
    };
    const now = Date.now();
    await persist(addConnection(connectionsOf(get()), input, now));
    // Re-applied to the latest state: a route recorded while the write ran stays.
    set(published(addConnection(connectionsOf(get()), input, now)));
  },
  select: async (host) => {
    const before = connectionsOf(get());
    const next = selectConnection(before, host);
    if (next.current === before.current) return;
    set(published(next));
    await persistQuietly(next);
  },
  remove: async (host, opts) => {
    const before = connectionsOf(get());
    const next = removeConnection(before, host, opts);
    if (next.list.length === before.list.length) return;
    set(published(next));
    await persistQuietly(next);
  },
  rememberRoute: (serverUrl, route) => {
    const host = hostOf(serverUrl);
    if (!host) return;
    const before = connectionsOf(get());
    const next = rememberRoute(before, host, route);
    if (next.list === before.list) return;
    set(published(next));
    void persistQuietly(next);
  },
  applyManaged: (config) => {
    const before = get();
    if (sameManagedConfig(before.managed, config)) return;
    const declined =
      config.serverUrl !== null && before.managedDeclined === managedServerKey(config.serverUrl)
        ? before.managedDeclined
        : null;
    const current = connectionsOf(before);
    const next = preferManaged(current, config);
    set({ ...published(next), managed: config, managedDeclined: declined });
    if (next.current !== current.current) void persistQuietly(next);
  },
  declineManaged: () => {
    const { managed } = get();
    if (managed.serverUrl === null || isLocked(managed)) return;
    set({ managedDeclined: managedServerKey(managed.serverUrl) });
  },
  reset: async () => {
    const { currentHost, connections, managed } = get();
    if (currentHost === null) return;
    if (lockedHost(connections, managed) === currentHost) throw new Error(LOCKED_SERVER_MESSAGE);
    await get().remove(currentHost);
  },
}));

/** Stop following managed config changes (tests; the app follows them for its lifetime). */
export function stopManagedConfigFollowing(): void {
  stopFollowingManaged?.();
  stopFollowingManaged = null;
}
