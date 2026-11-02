import { renderHook, act, waitFor } from "@testing-library/react-native";
import * as Network from "expo-network";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";

const mockGet = Network.getNetworkStateAsync as jest.Mock;
const mockListen = Network.addNetworkStateListener as jest.Mock;

beforeEach(() => {
  mockGet.mockReset();
  mockListen.mockReset();
  mockListen.mockReturnValue({ remove: jest.fn() });
});

describe("useNetworkStatus", () => {
  it("reads the state on mount", async () => {
    mockGet.mockResolvedValue({ isConnected: true, type: "WIFI" });
    const { result } = renderHook(() => useNetworkStatus());
    await waitFor(() => expect(result.current.networkType).toBe("WIFI"));
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it("follows the OS listener", async () => {
    mockGet.mockResolvedValue({ isConnected: true, type: "WIFI" });
    const { result } = renderHook(() => useNetworkStatus());
    await waitFor(() => expect(mockListen).toHaveBeenCalled());
    const listener = mockListen.mock.calls[0][0];
    act(() => listener({ isConnected: false, type: "NONE" }));
    expect(result.current.isOffline).toBe(true);
  });

  it("assumes connected when the state cannot be read", async () => {
    mockGet.mockRejectedValue(new Error("no module"));
    const { result } = renderHook(() => useNetworkStatus());
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(result.current.isConnected).toBe(true);
  });

  it("removes the listener on unmount", async () => {
    const remove = jest.fn();
    mockListen.mockReturnValue({ remove });
    mockGet.mockResolvedValue({ isConnected: true, type: "WIFI" });
    const { unmount } = renderHook(() => useNetworkStatus());
    await waitFor(() => expect(mockListen).toHaveBeenCalled());
    unmount();
    expect(remove).toHaveBeenCalled();
  });
});
