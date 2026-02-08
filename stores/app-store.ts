import { create } from "zustand";

interface AppState {
  /** Currently selected app ID */
  currentAppId: string | null;
  /** Whether the app is in offline mode */
  isOffline: boolean;
  /** Set the current app */
  setCurrentApp: (appId: string | null) => void;
  /** Set offline mode */
  setOffline: (offline: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentAppId: null,
  isOffline: false,
  setCurrentApp: (appId) => set({ currentAppId: appId }),
  setOffline: (offline) => set({ isOffline: offline }),
}));
