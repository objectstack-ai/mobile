/**
 * Tests for useAuditLog – validates audit log fetching
 * with optional pagination options.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockList = jest.fn();

const mockClient = {
  system: {
    audit: { list: mockList },
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useAuditLog } from "~/hooks/useAuditLog";

beforeEach(() => {
  mockList.mockReset();
});

describe("useAuditLog", () => {
  it("getAuditLog fetches and stores entries", async () => {
    const entries = [
      {
        id: "audit-1",
        action: "create",
        object: "tasks",
        recordId: "task-1",
        userId: "user-1",
        timestamp: "2026-01-01T00:00:00Z",
        changes: [{ field: "status", oldValue: null, newValue: "open" }],
      },
      {
        id: "audit-2",
        action: "update",
        object: "tasks",
        recordId: "task-1",
        userId: "user-1",
        timestamp: "2026-01-02T00:00:00Z",
        changes: [{ field: "status", oldValue: "open", newValue: "closed" }],
      },
    ];
    mockList.mockResolvedValue(entries);

    const { result } = renderHook(() => useAuditLog());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.getAuditLog("tasks", "task-1");
    });

    expect(mockList).toHaveBeenCalledWith({ object: "tasks", recordId: "task-1" });
    expect(returned).toEqual(entries);
    expect(result.current.entries).toEqual(entries);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("getAuditLog with options (limit, offset)", async () => {
    const entries = [
      {
        id: "audit-3",
        action: "delete",
        object: "tasks",
        recordId: "task-2",
        userId: "user-2",
        timestamp: "2026-01-03T00:00:00Z",
      },
    ];
    mockList.mockResolvedValue(entries);

    const { result } = renderHook(() => useAuditLog());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.getAuditLog("tasks", "task-2", {
        limit: 10,
        offset: 5,
      });
    });

    expect(mockList).toHaveBeenCalledWith({
      object: "tasks",
      recordId: "task-2",
      limit: 10,
      offset: 5,
    });
    expect(returned).toEqual(entries);
    expect(result.current.entries).toEqual(entries);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles getAuditLog error", async () => {
    mockList.mockRejectedValue(new Error("Access denied"));

    const { result } = renderHook(() => useAuditLog());

    await act(async () => {
      await expect(result.current.getAuditLog("tasks", "task-1")).rejects.toThrow("Access denied");
    });

    expect(result.current.entries).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe("Access denied");
  });
});
