import { useUIStore } from "~/stores/ui-store";

describe("ui-store", () => {
  beforeEach(() => {
    useUIStore.setState({ theme: "system", language: "en" });
  });

  it("has correct default state", () => {
    const state = useUIStore.getState();
    expect(state.theme).toBe("system");
    expect(state.language).toBe("en");
  });

  it("sets the theme", () => {
    useUIStore.getState().setTheme("dark");
    expect(useUIStore.getState().theme).toBe("dark");
  });

  it("sets the language", () => {
    useUIStore.getState().setLanguage("zh");
    expect(useUIStore.getState().language).toBe("zh");
  });
});
