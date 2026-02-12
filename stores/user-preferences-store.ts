import { create } from "zustand";

interface UserPreferencesState {
  onboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;
  tooltipsDismissed: string[];
  dismissTooltip: (key: string) => void;
  resetTooltips: () => void;
}

export const useUserPreferencesStore = create<UserPreferencesState>((set) => ({
  onboardingComplete: false,
  setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
  tooltipsDismissed: [],
  dismissTooltip: (key) =>
    set((state) => ({
      tooltipsDismissed: state.tooltipsDismissed.includes(key)
        ? state.tooltipsDismissed
        : [...state.tooltipsDismissed, key],
    })),
  resetTooltips: () => set({ tooltipsDismissed: [] }),
}));
