import { create } from "zustand";
import { clearServerUrl, getServerUrl, setServerUrl } from "~/lib/server-url";

interface ServerState {
  /** The configured ObjectStack server base URL, or `null` if unset. */
  serverUrl: string | null;
  /** True once the persisted URL has been read from storage on startup. */
  isReady: boolean;
  /** Load the persisted server URL. */
  hydrate: () => Promise<void>;
  /** Persist a new server URL. */
  connect: (url: string) => Promise<void>;
  /** Forget the configured server. */
  reset: () => Promise<void>;
}

/**
 * Reactive source of truth for the configured server URL.
 *
 * `lib/server-url.ts` owns persistence; this store mirrors it in memory so the
 * start screen and the Console screen re-render the moment the user connects
 * or resets. The shell holds no API client — the Console talks to the server.
 */
export const useServerStore = create<ServerState>((set) => ({
  serverUrl: null,
  isReady: false,
  hydrate: async () => {
    const url = await getServerUrl();
    set({ serverUrl: url, isReady: true });
  },
  connect: async (url) => {
    await setServerUrl(url);
    set({ serverUrl: url });
  },
  reset: async () => {
    await clearServerUrl();
    set({ serverUrl: null });
  },
}));
