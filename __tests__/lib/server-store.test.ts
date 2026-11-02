const mockGetServerUrl = jest.fn();
const mockSetServerUrl = jest.fn();
const mockClearServerUrl = jest.fn();

jest.mock("~/lib/server-url", () => ({
  getServerUrl: (...args: unknown[]) => mockGetServerUrl(...args),
  setServerUrl: (...args: unknown[]) => mockSetServerUrl(...args),
  clearServerUrl: (...args: unknown[]) => mockClearServerUrl(...args),
}));

import { useServerStore } from "~/stores/server-store";

describe("server-store", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useServerStore.setState({ serverUrl: null, isReady: false });
  });

  it("starts unset and not ready", () => {
    const s = useServerStore.getState();
    expect(s.serverUrl).toBeNull();
    expect(s.isReady).toBe(false);
  });

  it("hydrates a persisted server and becomes ready", async () => {
    mockGetServerUrl.mockResolvedValue("https://acme.example.com");
    await useServerStore.getState().hydrate();
    expect(useServerStore.getState()).toMatchObject({
      serverUrl: "https://acme.example.com",
      isReady: true,
    });
  });

  it("becomes ready with no server on first launch", async () => {
    mockGetServerUrl.mockResolvedValue(null);
    await useServerStore.getState().hydrate();
    expect(useServerStore.getState()).toMatchObject({ serverUrl: null, isReady: true });
  });

  it("connect persists and publishes the server", async () => {
    mockSetServerUrl.mockResolvedValue(undefined);
    await useServerStore.getState().connect("https://acme.example.com");
    expect(mockSetServerUrl).toHaveBeenCalledWith("https://acme.example.com");
    expect(useServerStore.getState().serverUrl).toBe("https://acme.example.com");
  });

  it("reset clears storage and state", async () => {
    useServerStore.setState({ serverUrl: "https://acme.example.com", isReady: true });
    mockClearServerUrl.mockResolvedValue(undefined);
    await useServerStore.getState().reset();
    expect(mockClearServerUrl).toHaveBeenCalled();
    expect(useServerStore.getState().serverUrl).toBeNull();
  });
});
