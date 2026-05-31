const mockReinitializeAuthClient = jest.fn();
const mockSetObjectStackApiUrl = jest.fn();
const mockGetServerUrl = jest.fn();
const mockSetServerUrl = jest.fn();
const mockClearServerUrl = jest.fn();
const mockFetchServerAuthConfig = jest.fn();

jest.mock("~/lib/auth-client", () => ({
  reinitializeAuthClient: (...args: unknown[]) =>
    mockReinitializeAuthClient(...args),
}));

jest.mock("~/lib/objectstack", () => ({
  setObjectStackApiUrl: (...args: unknown[]) =>
    mockSetObjectStackApiUrl(...args),
}));

jest.mock("~/lib/server-url", () => ({
  getServerUrl: (...args: unknown[]) => mockGetServerUrl(...args),
  setServerUrl: (...args: unknown[]) => mockSetServerUrl(...args),
  clearServerUrl: (...args: unknown[]) => mockClearServerUrl(...args),
}));

jest.mock("~/lib/server-auth-config", () => ({
  fetchServerAuthConfig: (...args: unknown[]) =>
    mockFetchServerAuthConfig(...args),
}));

import { useServerStore } from "~/stores/server-store";

describe("server-store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useServerStore.setState({
      serverUrl: null,
      isReady: false,
      ssoProviders: null,
    });
  });

  it("has correct initial state", () => {
    const state = useServerStore.getState();
    expect(state.serverUrl).toBeNull();
    expect(state.isReady).toBe(false);
    expect(state.ssoProviders).toBeNull();
  });

  describe("hydrate", () => {
    it("sets serverUrl, isReady, and ssoProviders when URL is stored", async () => {
      mockGetServerUrl.mockResolvedValue("https://api.example.com");
      mockFetchServerAuthConfig.mockResolvedValue({
        socialProviders: ["google", "apple"],
      });

      await useServerStore.getState().hydrate();

      const state = useServerStore.getState();
      expect(state.serverUrl).toBe("https://api.example.com");
      expect(state.isReady).toBe(true);
      expect(state.ssoProviders).toEqual(["google", "apple"]);
    });

    it("retargets clients on hydrate with a URL", async () => {
      mockGetServerUrl.mockResolvedValue("https://api.example.com");
      mockFetchServerAuthConfig.mockResolvedValue({ socialProviders: [] });

      await useServerStore.getState().hydrate();

      expect(mockReinitializeAuthClient).toHaveBeenCalledWith(
        "https://api.example.com",
      );
      expect(mockSetObjectStackApiUrl).toHaveBeenCalledWith(
        "https://api.example.com",
      );
    });

    it("sets ssoProviders to [] when auth config fetch fails", async () => {
      mockGetServerUrl.mockResolvedValue("https://api.example.com");
      mockFetchServerAuthConfig.mockResolvedValue(null);

      await useServerStore.getState().hydrate();

      expect(useServerStore.getState().ssoProviders).toEqual([]);
    });

    it("sets isReady and empty ssoProviders when no URL is stored", async () => {
      mockGetServerUrl.mockResolvedValue(null);

      await useServerStore.getState().hydrate();

      const state = useServerStore.getState();
      expect(state.serverUrl).toBeNull();
      expect(state.isReady).toBe(true);
      expect(state.ssoProviders).toEqual([]);
    });
  });

  describe("connect", () => {
    it("persists URL, retargets clients, and sets ssoProviders", async () => {
      mockSetServerUrl.mockResolvedValue(undefined);
      mockFetchServerAuthConfig.mockResolvedValue({
        socialProviders: ["google"],
      });

      await useServerStore.getState().connect("https://new.example.com");

      expect(mockSetServerUrl).toHaveBeenCalledWith("https://new.example.com");
      expect(mockReinitializeAuthClient).toHaveBeenCalledWith(
        "https://new.example.com",
      );
      expect(mockSetObjectStackApiUrl).toHaveBeenCalledWith(
        "https://new.example.com",
      );

      const state = useServerStore.getState();
      expect(state.serverUrl).toBe("https://new.example.com");
      expect(state.ssoProviders).toEqual(["google"]);
    });

    it("sets ssoProviders to [] when auth config is unavailable", async () => {
      mockSetServerUrl.mockResolvedValue(undefined);
      mockFetchServerAuthConfig.mockResolvedValue(null);

      await useServerStore.getState().connect("https://new.example.com");

      expect(useServerStore.getState().ssoProviders).toEqual([]);
    });
  });

  describe("reset", () => {
    it("clears serverUrl and ssoProviders", async () => {
      useServerStore.setState({
        serverUrl: "https://api.example.com",
        ssoProviders: ["google"],
      });
      mockClearServerUrl.mockResolvedValue(undefined);

      await useServerStore.getState().reset();

      const state = useServerStore.getState();
      expect(state.serverUrl).toBeNull();
      expect(state.ssoProviders).toBeNull();
      expect(mockClearServerUrl).toHaveBeenCalled();
    });
  });
});
