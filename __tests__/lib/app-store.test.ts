import { useAppStore } from "~/stores/app-store";

describe("app-store", () => {
  beforeEach(() => {
    // Reset store state between tests
    useAppStore.setState({ currentAppId: null, isOffline: false });
  });

  it("has correct default state", () => {
    const state = useAppStore.getState();
    expect(state.currentAppId).toBeNull();
    expect(state.isOffline).toBe(false);
  });

  it("sets the current app", () => {
    useAppStore.getState().setCurrentApp("app-123");
    expect(useAppStore.getState().currentAppId).toBe("app-123");
  });

  it("sets offline mode", () => {
    useAppStore.getState().setOffline(true);
    expect(useAppStore.getState().isOffline).toBe(true);
  });

  it("clears the current app", () => {
    useAppStore.getState().setCurrentApp("app-123");
    useAppStore.getState().setCurrentApp(null);
    expect(useAppStore.getState().currentAppId).toBeNull();
  });
});
