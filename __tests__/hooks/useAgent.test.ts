/**
 * Tests for useAgent – validates AI agent task orchestration
 * including start, status polling, and cancellation operations.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockStartTask = jest.fn();
const mockGetTask = jest.fn();
const mockCancelTask = jest.fn();

const mockClient = {
  ai: { agents: { startTask: mockStartTask, getTask: mockGetTask, cancelTask: mockCancelTask } },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useAgent } from "~/hooks/useAgent";

beforeEach(() => {
  mockStartTask.mockReset();
  mockGetTask.mockReset();
  mockCancelTask.mockReset();
});

describe("useAgent", () => {
  it("starts a task", async () => {
    const task = {
      id: "task-1",
      status: "running",
      progress: 0,
      agentId: "summarizer",
      createdAt: "2024-01-01T00:00:00Z",
    };
    mockStartTask.mockResolvedValue(task);

    const { result } = renderHook(() => useAgent());

    let started: unknown;
    await act(async () => {
      started = await result.current.startTask("summarizer", { documentId: "abc" });
    });

    expect(mockStartTask).toHaveBeenCalledWith({
      agentId: "summarizer",
      input: { documentId: "abc" },
    });
    expect(started).toEqual(task);
    expect(result.current.currentTask).toEqual(task);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("gets task status", async () => {
    const task = {
      id: "task-1",
      status: "completed",
      progress: 100,
      result: { summary: "Done" },
      agentId: "summarizer",
      createdAt: "2024-01-01T00:00:00Z",
    };
    mockGetTask.mockResolvedValue(task);

    const { result } = renderHook(() => useAgent());

    let status: unknown;
    await act(async () => {
      status = await result.current.getTaskStatus("task-1");
    });

    expect(mockGetTask).toHaveBeenCalledWith("task-1");
    expect(status).toEqual(task);
    expect(result.current.currentTask).toEqual(task);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("cancels a running task", async () => {
    const task = {
      id: "task-2",
      status: "running",
      progress: 50,
      agentId: "analyzer",
      createdAt: "2024-01-01T00:00:00Z",
    };
    mockStartTask.mockResolvedValue(task);
    mockCancelTask.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAgent());

    await act(async () => {
      await result.current.startTask("analyzer", { data: "test" });
    });

    expect(result.current.currentTask?.status).toBe("running");

    await act(async () => {
      await result.current.cancelTask("task-2");
    });

    expect(mockCancelTask).toHaveBeenCalledWith("task-2");
    expect(result.current.currentTask?.status).toBe("cancelled");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles startTask error", async () => {
    mockStartTask.mockRejectedValue(new Error("Failed to start agent task"));

    const { result } = renderHook(() => useAgent());

    await act(async () => {
      await expect(
        result.current.startTask("bad-agent", {}),
      ).rejects.toThrow("Failed to start agent task");
    });

    expect(result.current.error?.message).toBe("Failed to start agent task");
  });

  it("handles cancelTask error", async () => {
    mockCancelTask.mockRejectedValue(new Error("Failed to cancel task"));

    const { result } = renderHook(() => useAgent());

    await act(async () => {
      await expect(
        result.current.cancelTask("nonexistent"),
      ).rejects.toThrow("Failed to cancel task");
    });

    expect(result.current.error?.message).toBe("Failed to cancel task");
  });
});
