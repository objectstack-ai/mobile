import { create } from "zustand";
import { reinitializeAuthClient } from "~/lib/auth-client";
import { setObjectStackApiUrl } from "~/lib/objectstack";
import {
  clearServerUrl,
  getServerUrl,
  setServerUrl,
} from "~/lib/server-url";

interface ServerState {
  /** The configured ObjectStack server base URL, or `null` if unset. */
  serverUrl: string | null;
  /** True once the persisted URL has been read from storage on startup. */
  isReady: boolean;
  /** Load the persisted server URL and point the auth/data clients at it. */
  hydrate: () => Promise<void>;
  /** Persist a new server URL and re-target the auth/data clients reactively. */
  connect: (url: string) => Promise<void>;
  /** Forget the configured server (used on reset / sign-out). */
  reset: () => Promise<void>;
}

/**
 * Point the auth client and the ObjectStack data client at `url`.
 * Centralised so startup hydration and the config screen stay in sync.
 */
function retargetClients(url: string) {
  reinitializeAuthClient(url);
  setObjectStackApiUrl(url);
}

/**
 * Reactive source of truth for the configured server URL.
 *
 * `lib/server-url.ts` owns persistence; this store mirrors it in memory so
 * `_layout`'s protected-route guard re-renders the moment the config screen
 * connects — without this, the guard reads a stale `null` and bounces the
 * user back to the server-config screen after a successful connection.
 */
export const useServerStore = create<ServerState>((set) => ({
  serverUrl: null,
  isReady: false,
  hydrate: async () => {
    const url = await getServerUrl();
    if (url) {
      retargetClients(url);
    }
    set({ serverUrl: url, isReady: true });
  },
  connect: async (url) => {
    await setServerUrl(url);
    retargetClients(url);
    set({ serverUrl: url });
  },
  reset: async () => {
    await clearServerUrl();
    set({ serverUrl: null });
  },
}));
