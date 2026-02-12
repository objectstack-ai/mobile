/**
 * Tests for useOptimisticUpdate — optimistic updates with rollback
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockUpdate = jest.fn();

const mockClient = {
  api: { update: mockUpdate },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useOptimisticUpdate } from "~/hooks/useOptimisticUpdate";

beforeEach(() => {
  mockUpdate.mockReset();
});

describe("useOptimisticUpdate", () => {
  it("starts with null data and no pending state", () => {
    const { result } = renderHook(() => useOptimisticUpdate<{ status: string }>());

    expect(result.current.optimisticData).toBeNull();
    expect(result.current.isPending).toBe(false);
    expect(result.current.isRolledBack).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("apply sets optimistic data and resolves with server response", async () => {
    const serverResponse = { status: "done", updatedAt: "2026-01-01" };
    mockUpdate.mockResolvedValue(serverResponse);

    const { result } = renderHook(() => useOptimisticUpdate<{ status: string }>());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.apply(
        "tasks",
        "task-1",
        { status: "done" },
        { status: "done" },
      );
    });

    expect(mockUpdate).toHaveBeenCalledWith("tasks", "task-1", { status: "done" });
    expect(returned).toEqual(serverResponse);
    expect(result.current.optimisticData).toEqual(serverResponse);
    expect(result.current.isPending).toBe(false);
    expect(result.current.isRolledBack).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("apply rolls back on server error", async () => {
    mockUpdate.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useOptimisticUpdate<{ status: string }>());

    await act(async () => {
      await expect(
        result.current.apply(
          "tasks",
          "task-1",
          { status: "done" },
          { status: "done" },
        ),
      ).rejects.toThrow("Server error");
    });

    expect(result.current.optimisticData).toBeNull(); // rolled back to previous (null)
    expect(result.current.isPending).toBe(false);
    expect(result.current.isRolledBack).toBe(true);
    expect(result.current.error?.message).toBe("Server error");
  });

  it("rollback manually reverts to previous value", async () => {
    const serverResponse = { status: "done" };
    mockUpdate.mockResolvedValue(serverResponse);

    const { result } = renderHook(() => useOptimisticUpdate<{ status: string }>());

    await act(async () => {
      await result.current.apply(
        "tasks",
        "task-1",
        { status: "done" },
        { status: "done" },
      );
    });

    expect(result.current.optimisticData).toEqual(serverResponse);

    act(() => {
      result.current.rollback();
    });

    // Rolled back to the value before the apply (null initially)
    expect(result.current.optimisticData).toBeNull();
    expect(result.current.isRolledBack).toBe(true);
  });

  it("handles non-Error thrown values", async () => {
    mockUpdate.mockRejectedValue("string error");

    const { result } = renderHook(() => useOptimisticUpdate<{ status: string }>());

    await act(async () => {
      await expect(
        result.current.apply(
          "tasks",
          "task-1",
          { status: "done" },
          { status: "done" },
        ),
      ).rejects.toThrow("Optimistic update failed");
    });

    expect(result.current.error?.message).toBe("Optimistic update failed");
  });
});
