/**
 * Tests for useWatchConnectivity – validates watch connection state,
 * message sending, pending actions, and support flags.
 */
import { renderHook, act } from "@testing-library/react-native";

import { useWatchConnectivity } from "~/hooks/useWatchConnectivity";

describe("useWatchConnectivity", () => {
  it("starts with all connectivity flags false", () => {
    const { result } = renderHook(() => useWatchConnectivity());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isPaired).toBe(false);
    expect(result.current.isReachable).toBe(false);
    expect(result.current.isSupported).toBe(false);
  });

  it("starts with no messages or pending actions", () => {
    const { result } = renderHook(() => useWatchConnectivity());

    expect(result.current.lastMessage).toBeNull();
    expect(result.current.pendingActions).toEqual([]);
  });

  it("sendMessage adds to pendingActions and sets lastMessage", async () => {
    const { result } = renderHook(() => useWatchConnectivity());

    await act(async () => {
      await result.current.sendMessage({
        type: "refresh",
        payload: { screen: "dashboard" },
      });
    });

    expect(result.current.pendingActions).toHaveLength(1);
    expect(result.current.pendingActions[0].type).toBe("refresh");
    expect(result.current.pendingActions[0].payload).toEqual({
      screen: "dashboard",
    });
    expect(result.current.pendingActions[0].timestamp).toBeGreaterThan(0);

    expect(result.current.lastMessage).not.toBeNull();
    expect(result.current.lastMessage!.type).toBe("refresh");
  });

  it("sendMessage accumulates pending actions", async () => {
    const { result } = renderHook(() => useWatchConnectivity());

    await act(async () => {
      await result.current.sendMessage({ type: "a", payload: {} });
    });
    await act(async () => {
      await result.current.sendMessage({ type: "b", payload: {} });
    });

    expect(result.current.pendingActions).toHaveLength(2);
    expect(result.current.lastMessage!.type).toBe("b");
  });

  it("clearPendingActions empties the queue", async () => {
    const { result } = renderHook(() => useWatchConnectivity());

    await act(async () => {
      await result.current.sendMessage({ type: "test", payload: {} });
    });

    expect(result.current.pendingActions).toHaveLength(1);

    act(() => {
      result.current.clearPendingActions();
    });

    expect(result.current.pendingActions).toEqual([]);
  });

  it("clearPendingActions does not affect lastMessage", async () => {
    const { result } = renderHook(() => useWatchConnectivity());

    await act(async () => {
      await result.current.sendMessage({
        type: "notification",
        payload: { count: 5 },
      });
    });

    act(() => {
      result.current.clearPendingActions();
    });

    expect(result.current.lastMessage).not.toBeNull();
    expect(result.current.lastMessage!.type).toBe("notification");
  });
});
