/**
 * Tests for useBatchOperations – validates batch create/update/delete
 * operations via client.data.batch(), createMany(), deleteMany().
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockBatch = jest.fn();
const mockCreateMany = jest.fn();
const mockDeleteMany = jest.fn();

const mockClient = {
  data: {
    batch: mockBatch,
    createMany: mockCreateMany,
    deleteMany: mockDeleteMany,
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useBatchOperations } from "~/hooks/useBatchOperations";

beforeEach(() => {
  mockBatch.mockReset();
  mockCreateMany.mockReset();
  mockDeleteMany.mockReset();
});

describe("useBatchOperations", () => {
  it("batchCreate calls client.data.createMany()", async () => {
    const records = [{ name: "A" }, { name: "B" }, { name: "C" }];
    mockCreateMany.mockResolvedValue(records.map((r, i) => ({ id: `id-${i}`, ...r })));

    const { result } = renderHook(() => useBatchOperations("tasks"));

    let batchResult: any;
    await act(async () => {
      batchResult = await result.current.batchCreate(records);
    });

    expect(mockCreateMany).toHaveBeenCalledWith("tasks", records);
    expect(batchResult.succeeded).toBe(3);
    expect(batchResult.failed).toBe(0);
    expect(result.current.isProcessing).toBe(false);
  });

  it("batchDelete calls client.data.deleteMany()", async () => {
    const ids = ["id-1", "id-2"];
    mockDeleteMany.mockResolvedValue({ deleted: 2 });

    const { result } = renderHook(() => useBatchOperations("tasks"));

    let batchResult: any;
    await act(async () => {
      batchResult = await result.current.batchDelete(ids);
    });

    expect(mockDeleteMany).toHaveBeenCalledWith("tasks", ids);
    expect(batchResult.succeeded).toBe(2);
    expect(batchResult.failed).toBe(0);
  });

  it("executeBatch sends mixed operations via client.data.batch()", async () => {
    mockBatch.mockResolvedValue([
      { success: true },
      { success: true },
      { success: true },
    ]);

    const { result } = renderHook(() => useBatchOperations("tasks"));

    const items = [
      { operation: "create" as const, data: { name: "New Task" } },
      { operation: "update" as const, recordId: "id-1", data: { name: "Updated" } },
      { operation: "delete" as const, recordId: "id-2" },
    ];

    let batchResult: any;
    await act(async () => {
      batchResult = await result.current.executeBatch(items);
    });

    expect(mockBatch).toHaveBeenCalled();
    expect(batchResult.succeeded).toBe(3);
    expect(batchResult.failed).toBe(0);
    expect(batchResult.skipped).toBe(0);
  });

  it("skips update/delete items without recordId", async () => {
    mockBatch.mockResolvedValue([{ success: true }]);

    const { result } = renderHook(() => useBatchOperations("tasks"));

    const items = [
      { operation: "create" as const, data: { name: "New" } },
      { operation: "update" as const, data: { name: "No ID" } }, // no recordId → skipped
      { operation: "delete" as const }, // no recordId → skipped
    ];

    let batchResult: any;
    await act(async () => {
      batchResult = await result.current.executeBatch(items);
    });

    expect(batchResult.skipped).toBe(2);
    expect(batchResult.succeeded).toBe(1);
  });

  it("handles batch create error", async () => {
    mockCreateMany.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useBatchOperations("tasks"));

    let batchResult: any;
    await act(async () => {
      batchResult = await result.current.batchCreate([{ name: "A" }]);
    });

    expect(batchResult.failed).toBe(1);
    expect(batchResult.errors[0].message).toBe("Server error");
    expect(result.current.isProcessing).toBe(false);
  });

  it("tracks progress during batch operations", async () => {
    mockCreateMany.mockResolvedValue([{ id: "1", name: "A" }]);

    const { result } = renderHook(() => useBatchOperations("tasks"));

    expect(result.current.progress.total).toBe(0);

    await act(async () => {
      await result.current.batchCreate([{ name: "A" }]);
    });

    expect(result.current.progress.total).toBe(1);
    expect(result.current.progress.completed).toBe(1);
  });

  it("batchUpdate delegates to executeBatch", async () => {
    mockBatch.mockResolvedValue([
      { success: true },
      { success: true },
    ]);

    const { result } = renderHook(() => useBatchOperations("tasks"));

    let batchResult: any;
    await act(async () => {
      batchResult = await result.current.batchUpdate(
        ["id-1", "id-2"],
        { status: "done" },
      );
    });

    expect(mockBatch).toHaveBeenCalled();
    expect(batchResult.succeeded).toBe(2);
  });
});
