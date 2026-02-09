/**
 * Tests for useSubscription – validates realtime connection
 * lifecycle, subscription, and presence management.
 */
import { renderHook, act, waitFor } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockSetPresence = jest.fn();
const mockGetPresence = jest.fn();

const mockClient = {
  realtime: {
    connect: mockConnect,
    disconnect: mockDisconnect,
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
    setPresence: mockSetPresence,
    getPresence: mockGetPresence,
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useSubscription } from "~/hooks/useSubscription";

beforeEach(() => {
  mockConnect.mockReset();
  mockDisconnect.mockReset();
  mockSubscribe.mockReset();
  mockUnsubscribe.mockReset();
  mockSetPresence.mockReset();
  mockGetPresence.mockReset();
});

describe("useSubscription", () => {
  it("connects and subscribes on mount when enabled", async () => {
    mockConnect.mockResolvedValue({
      connectionId: "conn-1",
      transport: "websocket",
    });
    mockSubscribe.mockResolvedValue({
      subscriptionId: "sub-1",
      channel: "object:tasks",
    });

    const { result } = renderHook(() =>
      useSubscription({
        channel: "object:tasks",
        events: ["record.created"],
      }),
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(result.current.connectionId).toBe("conn-1");
    expect(result.current.subscriptionId).toBe("sub-1");
    expect(result.current.error).toBeNull();
    expect(mockConnect).toHaveBeenCalledWith({
      transport: "websocket",
      channels: ["object:tasks"],
    });
    expect(mockSubscribe).toHaveBeenCalledWith({
      channel: "object:tasks",
      events: ["record.created"],
    });
  });

  it("does not connect when enabled is false", async () => {
    const { result } = renderHook(() =>
      useSubscription({
        channel: "object:tasks",
        enabled: false,
      }),
    );

    // Give a tick for any async effects
    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });

    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("handles connection error", async () => {
    mockConnect.mockRejectedValue(new Error("WebSocket failed"));

    const { result } = renderHook(() =>
      useSubscription({ channel: "object:tasks" }),
    );

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error?.message).toBe("WebSocket failed");
  });

  it("fetches presence members", async () => {
    mockConnect.mockResolvedValue({
      connectionId: "conn-1",
      transport: "websocket",
    });
    mockSubscribe.mockResolvedValue({
      subscriptionId: "sub-1",
      channel: "object:tasks",
    });
    mockGetPresence.mockResolvedValue({
      channel: "object:tasks",
      members: [
        { userId: "user-1", status: "online", lastSeen: "2026-01-01T00:00:00Z" },
        { userId: "user-2", status: "away", lastSeen: "2026-01-01T00:00:00Z" },
      ],
    });

    const { result } = renderHook(() =>
      useSubscription({ channel: "object:tasks" }),
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    await act(async () => {
      await result.current.fetchPresence();
    });

    expect(result.current.presence).toHaveLength(2);
    expect(result.current.presence[0].userId).toBe("user-1");
    expect(result.current.presence[1].status).toBe("away");
  });

  it("sets own presence", async () => {
    mockConnect.mockResolvedValue({
      connectionId: "conn-1",
      transport: "websocket",
    });
    mockSubscribe.mockResolvedValue({
      subscriptionId: "sub-1",
      channel: "object:tasks",
    });
    mockSetPresence.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useSubscription({ channel: "object:tasks" }),
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    await act(async () => {
      await result.current.setPresence("busy", { editing: true });
    });

    expect(mockSetPresence).toHaveBeenCalledWith("object:tasks", {
      userId: "current",
      status: "busy",
      lastSeen: expect.any(String),
      metadata: { editing: true },
    });
  });
});
