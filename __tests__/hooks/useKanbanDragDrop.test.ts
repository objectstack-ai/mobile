/**
 * Tests for useKanbanDragDrop – validates Kanban drag-and-drop
 * state management and card movement.
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

import { useKanbanDragDrop, KanbanCard } from "~/hooks/useKanbanDragDrop";

beforeEach(() => {
  mockUpdate.mockReset();
});

describe("useKanbanDragDrop", () => {
  const card1: KanbanCard = {
    id: "card-1",
    columnId: "todo",
    index: 0,
    data: { title: "Task 1" },
  };
  const card2: KanbanCard = {
    id: "card-2",
    columnId: "todo",
    index: 1,
    data: { title: "Task 2" },
  };

  it("starts with no dragged card", () => {
    const { result } = renderHook(() => useKanbanDragDrop());
    expect(result.current.draggedCard).toBeNull();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("startDrag sets the dragged card", () => {
    const { result } = renderHook(() => useKanbanDragDrop());

    act(() => {
      result.current.startDrag(card1);
    });

    expect(result.current.draggedCard).toEqual(card1);
    expect(result.current.isDragging).toBe(true);
  });

  it("endDrag clears the dragged card", () => {
    const { result } = renderHook(() => useKanbanDragDrop());

    act(() => {
      result.current.startDrag(card1);
    });
    act(() => {
      result.current.endDrag();
    });

    expect(result.current.draggedCard).toBeNull();
    expect(result.current.isDragging).toBe(false);
  });

  it("cancelDrag clears the dragged card", () => {
    const { result } = renderHook(() => useKanbanDragDrop());

    act(() => {
      result.current.startDrag(card1);
    });
    act(() => {
      result.current.cancelDrag();
    });

    expect(result.current.draggedCard).toBeNull();
    expect(result.current.isDragging).toBe(false);
  });

  it("initColumns sets column data", () => {
    const { result } = renderHook(() => useKanbanDragDrop());

    const cols = new Map<string, KanbanCard[]>();
    cols.set("todo", [card1, card2]);
    cols.set("done", []);

    act(() => {
      result.current.initColumns(cols);
    });

    expect(result.current.columns.get("todo")).toEqual([card1, card2]);
    expect(result.current.columns.get("done")).toEqual([]);
  });

  it("moveCard moves a card between columns and persists", async () => {
    mockUpdate.mockResolvedValue(undefined);

    const { result } = renderHook(() => useKanbanDragDrop());

    const cols = new Map<string, KanbanCard[]>();
    cols.set("todo", [card1, card2]);
    cols.set("done", []);

    act(() => {
      result.current.initColumns(cols);
    });

    await act(async () => {
      await result.current.moveCard("card-1", "done", 0);
    });

    expect(result.current.columns.get("todo")).toHaveLength(1);
    expect(result.current.columns.get("done")).toHaveLength(1);
    expect(result.current.columns.get("done")![0].id).toBe("card-1");
    expect(result.current.columns.get("done")![0].columnId).toBe("done");
    expect(mockUpdate).toHaveBeenCalledWith("cards", "card-1", {
      columnId: "done",
      index: 0,
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("handles moveCard error", async () => {
    mockUpdate.mockRejectedValue(new Error("Update failed"));

    const { result } = renderHook(() => useKanbanDragDrop());

    const cols = new Map<string, KanbanCard[]>();
    cols.set("todo", [card1]);
    cols.set("done", []);

    act(() => {
      result.current.initColumns(cols);
    });

    await act(async () => {
      await expect(
        result.current.moveCard("card-1", "done", 0),
      ).rejects.toThrow("Update failed");
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe("Update failed");
  });
});
