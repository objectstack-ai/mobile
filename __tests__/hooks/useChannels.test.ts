/**
 * Tests for useChannels – validates channel listing,
 * creation, joining, and leaving operations.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockList = jest.fn();
const mockCreate = jest.fn();
const mockJoin = jest.fn();
const mockLeave = jest.fn();

const mockClient = {
  realtime: {
    channels: { list: mockList, create: mockCreate, join: mockJoin, leave: mockLeave },
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useChannels } from "~/hooks/useChannels";

beforeEach(() => {
  mockList.mockReset();
  mockCreate.mockReset();
  mockJoin.mockReset();
  mockLeave.mockReset();
});

describe("useChannels", () => {
  it("lists channels", async () => {
    const channels = [
      { id: "ch-1", name: "general", type: "public", members: ["user-1"], createdBy: "user-1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", unreadCount: 3 },
      { id: "ch-2", name: "engineering", type: "private", members: ["user-1", "user-2"], createdBy: "user-2", createdAt: "2026-01-02T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z", unreadCount: 0 },
    ];
    mockList.mockResolvedValue(channels);

    const { result } = renderHook(() => useChannels());

    let listed: unknown;
    await act(async () => {
      listed = await result.current.listChannels();
    });

    expect(mockList).toHaveBeenCalled();
    expect(listed).toEqual(channels);
    expect(result.current.channels).toEqual(channels);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("creates a channel", async () => {
    const channel = { id: "ch-3", name: "design", description: "Design team", type: "public", members: ["user-1"], createdBy: "user-1", createdAt: "2026-01-03T00:00:00Z", updatedAt: "2026-01-03T00:00:00Z", unreadCount: 0 };
    mockCreate.mockResolvedValue(channel);

    const { result } = renderHook(() => useChannels());

    let created: unknown;
    await act(async () => {
      created = await result.current.createChannel("design", "public", "Design team");
    });

    expect(mockCreate).toHaveBeenCalledWith({ name: "design", type: "public", description: "Design team" });
    expect(created).toEqual(channel);
    expect(result.current.channels).toContainEqual(channel);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("joins a channel", async () => {
    mockJoin.mockResolvedValue(undefined);

    const { result } = renderHook(() => useChannels());

    await act(async () => {
      await result.current.joinChannel("ch-1");
    });

    expect(mockJoin).toHaveBeenCalledWith("ch-1");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("leaves a channel and removes from list", async () => {
    const channels = [
      { id: "ch-1", name: "general", type: "public", members: ["user-1"], createdBy: "user-1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", unreadCount: 0 },
    ];
    mockList.mockResolvedValue(channels);
    mockLeave.mockResolvedValue(undefined);

    const { result } = renderHook(() => useChannels());

    await act(async () => {
      await result.current.listChannels();
    });
    expect(result.current.channels).toHaveLength(1);

    await act(async () => {
      await result.current.leaveChannel("ch-1");
    });

    expect(mockLeave).toHaveBeenCalledWith("ch-1");
    expect(result.current.channels).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
  });

  it("sets active channel", async () => {
    const channels = [
      { id: "ch-1", name: "general", type: "public", members: ["user-1"], createdBy: "user-1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", unreadCount: 0 },
    ];
    mockList.mockResolvedValue(channels);

    const { result } = renderHook(() => useChannels());

    await act(async () => {
      await result.current.listChannels();
    });

    act(() => {
      result.current.setActiveChannel("ch-1");
    });

    expect(result.current.activeChannel).toEqual(channels[0]);
  });

  it("handles create error", async () => {
    mockCreate.mockRejectedValue(new Error("Failed to create channel"));

    const { result } = renderHook(() => useChannels());

    await act(async () => {
      await expect(result.current.createChannel("bad", "public")).rejects.toThrow("Failed to create channel");
    });

    expect(result.current.error?.message).toBe("Failed to create channel");
  });

  it("handles join error", async () => {
    mockJoin.mockRejectedValue(new Error("Failed to join channel"));

    const { result } = renderHook(() => useChannels());

    await act(async () => {
      await expect(result.current.joinChannel("ch-1")).rejects.toThrow("Failed to join channel");
    });

    expect(result.current.error?.message).toBe("Failed to join channel");
  });

  it("handles leave error", async () => {
    mockLeave.mockRejectedValue(new Error("Failed to leave channel"));

    const { result } = renderHook(() => useChannels());

    await act(async () => {
      await expect(result.current.leaveChannel("ch-1")).rejects.toThrow("Failed to leave channel");
    });

    expect(result.current.error?.message).toBe("Failed to leave channel");
  });
});
