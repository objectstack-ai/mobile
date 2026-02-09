/**
 * Tests for useNetworkStatus – validates network connectivity monitoring
 * and global offline state updates.
 */
import { renderHook, act, waitFor } from "@testing-library/react-native";

/* ---- Mock expo-network ---- */
const mockGetNetworkStateAsync = jest.fn();
jest.mock("expo-network", () => ({
  getNetworkStateAsync: (...args: any[]) => mockGetNetworkStateAsync(...args),
  NetworkStateType: {
    NONE: "NONE",
    WIFI: "WIFI",
    CELLULAR: "CELLULAR",
    BLUETOOTH: "BLUETOOTH",
    ETHERNET: "ETHERNET",
    WIMAX: "WIMAX",
    VPN: "VPN",
    OTHER: "OTHER",
    UNKNOWN: "UNKNOWN",
  },
}));

/* ---- Mock app store ---- */
const mockSetOffline = jest.fn();
jest.mock("~/stores/app-store", () => ({
  useAppStore: (selector: any) =>
    selector({ setOffline: mockSetOffline }),
}));

import { useNetworkStatus } from "~/hooks/useNetworkStatus";

beforeEach(() => {
  jest.useFakeTimers();
  mockGetNetworkStateAsync.mockReset();
  mockSetOffline.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useNetworkStatus", () => {
  it("checks network state on mount", async () => {
    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      type: "WIFI",
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(mockGetNetworkStateAsync).toHaveBeenCalled();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it("sets offline when not connected", async () => {
    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: false,
      type: "NONE",
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });

    expect(result.current.isOffline).toBe(true);
    expect(mockSetOffline).toHaveBeenCalledWith(true);
  });

  it("handles network check errors gracefully", async () => {
    mockGetNetworkStateAsync.mockRejectedValue(new Error("Failed"));

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(mockGetNetworkStateAsync).toHaveBeenCalled();
    });

    // Assumes connected on error
    expect(result.current.isConnected).toBe(true);
    expect(mockSetOffline).toHaveBeenCalledWith(false);
  });

  it("provides a manual refresh function", async () => {
    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      type: "WIFI",
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: false,
      type: "NONE",
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.isConnected).toBe(false);
  });

  it("exposes networkType", async () => {
    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      type: "CELLULAR",
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.networkType).toBe("CELLULAR");
    });
  });
});
