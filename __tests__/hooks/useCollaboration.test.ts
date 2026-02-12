/**
 * Tests for useCollaboration – validates joining, leaving,
 * and cursor updates in a collaboration session.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockJoin = jest.fn();
const mockLeave = jest.fn();
const mockGetParticipants = jest.fn();
const mockUpdateCursor = jest.fn();

const mockClient = {
  realtime: {
    collaboration: {
      join: mockJoin,
      leave: mockLeave,
      getParticipants: mockGetParticipants,
      updateCursor: mockUpdateCursor,
    },
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useCollaboration } from "~/hooks/useCollaboration";

beforeEach(() => {
  mockJoin.mockReset();
  mockLeave.mockReset();
  mockGetParticipants.mockReset();
  mockUpdateCursor.mockReset();
});

describe("useCollaboration", () => {
  it("join connects and fetches participants", async () => {
    const participants = [
      { userId: "user-1", status: "active", color: "#ff0000", lastSeen: "2026-01-01T00:00:00Z" },
      { userId: "user-2", status: "idle", color: "#00ff00", lastSeen: "2026-01-01T00:00:00Z" },
    ];
    mockJoin.mockResolvedValue(undefined);
    mockGetParticipants.mockResolvedValue(participants);

    const { result } = renderHook(() => useCollaboration());

    await act(async () => {
      await result.current.join("tasks", "task-123");
    });

    expect(mockJoin).toHaveBeenCalledWith("tasks", "task-123");
    expect(mockGetParticipants).toHaveBeenCalled();
    expect(result.current.participants).toEqual(participants);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("leave disconnects and clears participants", async () => {
    mockJoin.mockResolvedValue(undefined);
    mockGetParticipants.mockResolvedValue([
      { userId: "user-1", status: "active", color: "#ff0000", lastSeen: "2026-01-01T00:00:00Z" },
    ]);
    mockLeave.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCollaboration());

    // First join
    await act(async () => {
      await result.current.join("tasks", "task-123");
    });
    expect(result.current.isConnected).toBe(true);

    // Then leave
    await act(async () => {
      await result.current.leave();
    });

    expect(mockLeave).toHaveBeenCalled();
    expect(result.current.participants).toEqual([]);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("updateCursor sends cursor data", async () => {
    mockUpdateCursor.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCollaboration());

    const cursor = { x: 100, y: 200, field: "name" };
    await act(async () => {
      await result.current.updateCursor(cursor);
    });

    expect(mockUpdateCursor).toHaveBeenCalledWith(cursor);
    expect(result.current.error).toBeNull();
  });

  it("handles join error", async () => {
    mockJoin.mockRejectedValue(new Error("Connection refused"));

    const { result } = renderHook(() => useCollaboration());

    await act(async () => {
      await expect(result.current.join("tasks", "task-123")).rejects.toThrow("Connection refused");
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe("Connection refused");
  });

  it("handles leave error", async () => {
    mockLeave.mockRejectedValue(new Error("Disconnect failed"));

    const { result } = renderHook(() => useCollaboration());

    await act(async () => {
      await expect(result.current.leave()).rejects.toThrow("Disconnect failed");
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe("Disconnect failed");
  });
});
