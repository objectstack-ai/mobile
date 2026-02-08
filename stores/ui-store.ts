import { create } from "zustand";

interface UIState {
  /** Current theme mode */
  theme: "light" | "dark" | "system";
  /** Set theme */
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "system",
  setTheme: (theme) => set({ theme }),
}));
