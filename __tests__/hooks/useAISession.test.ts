/**
 * Tests for useAISession – validates AI conversation session
 * create, resume, delete, and list operations.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockCreate = jest.fn();
const mockGet = jest.fn();
const mockDelete = jest.fn();
const mockList = jest.fn();

const mockClient = {
  ai: { sessions: { create: mockCreate, get: mockGet, delete: mockDelete, list: mockList } },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useAISession } from "~/hooks/useAISession";

beforeEach(() => {
  mockCreate.mockReset();
  mockGet.mockReset();
  mockDelete.mockReset();
  mockList.mockReset();
});

describe("useAISession", () => {
  it("creates session and adds to list", async () => {
    const session = {
      id: "sess-1",
      title: "My Chat",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      messageCount: 0,
      tokenUsage: 0,
    };
    mockCreate.mockResolvedValue(session);

    const { result } = renderHook(() => useAISession());

    let created: unknown;
    await act(async () => {
      created = await result.current.createSession("My Chat");
    });

    expect(mockCreate).toHaveBeenCalledWith({ title: "My Chat" });
    expect(created).toEqual(session);
    expect(result.current.activeSession).toEqual(session);
    expect(result.current.sessions).toContainEqual(session);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("resumes session by ID", async () => {
    const session = {
      id: "sess-2",
      title: "Resumed Chat",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      messageCount: 5,
      tokenUsage: 120,
    };
    mockGet.mockResolvedValue(session);

    const { result } = renderHook(() => useAISession());

    let resumed: unknown;
    await act(async () => {
      resumed = await result.current.resumeSession("sess-2");
    });

    expect(mockGet).toHaveBeenCalledWith("sess-2");
    expect(resumed).toEqual(session);
    expect(result.current.activeSession).toEqual(session);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("deletes session and removes from list", async () => {
    const session = {
      id: "sess-3",
      title: "To Delete",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      messageCount: 0,
      tokenUsage: 0,
    };
    mockCreate.mockResolvedValue(session);
    mockDelete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAISession());

    await act(async () => {
      await result.current.createSession("To Delete");
    });

    expect(result.current.sessions).toHaveLength(1);

    await act(async () => {
      await result.current.deleteSession("sess-3");
    });

    expect(mockDelete).toHaveBeenCalledWith("sess-3");
    expect(result.current.sessions).toHaveLength(0);
    expect(result.current.activeSession).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("lists all sessions", async () => {
    const sessions = [
      { id: "sess-1", title: "Chat 1", createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z", messageCount: 0, tokenUsage: 0 },
      { id: "sess-2", title: "Chat 2", createdAt: "2024-01-02T00:00:00Z", updatedAt: "2024-01-02T00:00:00Z", messageCount: 3, tokenUsage: 50 },
    ];
    mockList.mockResolvedValue(sessions);

    const { result } = renderHook(() => useAISession());

    let listed: unknown;
    await act(async () => {
      listed = await result.current.listSessions();
    });

    expect(mockList).toHaveBeenCalled();
    expect(listed).toEqual(sessions);
    expect(result.current.sessions).toEqual(sessions);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles create error", async () => {
    mockCreate.mockRejectedValue(new Error("Failed to create session"));

    const { result } = renderHook(() => useAISession());

    await act(async () => {
      await expect(
        result.current.createSession("Bad"),
      ).rejects.toThrow("Failed to create session");
    });

    expect(result.current.error?.message).toBe("Failed to create session");
  });

  it("handles resume error", async () => {
    mockGet.mockRejectedValue(new Error("Failed to resume session"));

    const { result } = renderHook(() => useAISession());

    await act(async () => {
      await expect(
        result.current.resumeSession("nonexistent"),
      ).rejects.toThrow("Failed to resume session");
    });

    expect(result.current.error?.message).toBe("Failed to resume session");
  });
});
