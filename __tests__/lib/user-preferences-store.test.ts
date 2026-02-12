import { useUserPreferencesStore } from "~/stores/user-preferences-store";

describe("user-preferences-store", () => {
  beforeEach(() => {
    useUserPreferencesStore.setState({
      onboardingComplete: false,
      tooltipsDismissed: [],
    });
  });

  it("has correct default state", () => {
    const state = useUserPreferencesStore.getState();
    expect(state.onboardingComplete).toBe(false);
    expect(state.tooltipsDismissed).toEqual([]);
  });

  it("setOnboardingComplete sets the flag", () => {
    useUserPreferencesStore.getState().setOnboardingComplete(true);
    expect(useUserPreferencesStore.getState().onboardingComplete).toBe(true);
  });

  it("setOnboardingComplete can reset the flag", () => {
    useUserPreferencesStore.getState().setOnboardingComplete(true);
    useUserPreferencesStore.getState().setOnboardingComplete(false);
    expect(useUserPreferencesStore.getState().onboardingComplete).toBe(false);
  });

  it("dismissTooltip adds a tooltip key", () => {
    useUserPreferencesStore.getState().dismissTooltip("tip1");
    expect(useUserPreferencesStore.getState().tooltipsDismissed).toEqual([
      "tip1",
    ]);
  });

  it("dismissTooltip accumulates keys", () => {
    useUserPreferencesStore.getState().dismissTooltip("tip1");
    useUserPreferencesStore.getState().dismissTooltip("tip2");
    expect(useUserPreferencesStore.getState().tooltipsDismissed).toEqual([
      "tip1",
      "tip2",
    ]);
  });

  it("dismissTooltip does not add duplicates", () => {
    useUserPreferencesStore.getState().dismissTooltip("tip1");
    useUserPreferencesStore.getState().dismissTooltip("tip1");
    expect(useUserPreferencesStore.getState().tooltipsDismissed).toEqual([
      "tip1",
    ]);
  });

  it("resetTooltips clears all dismissed tooltips", () => {
    useUserPreferencesStore.getState().dismissTooltip("tip1");
    useUserPreferencesStore.getState().dismissTooltip("tip2");
    useUserPreferencesStore.getState().resetTooltips();
    expect(useUserPreferencesStore.getState().tooltipsDismissed).toEqual([]);
  });
});
