/**
 * Tests for useInlineEdit – validates inline field editing
 * with save, cancel, and dirty state tracking.
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

import { useInlineEdit } from "~/hooks/useInlineEdit";

beforeEach(() => {
  mockUpdate.mockReset();
});

describe("useInlineEdit", () => {
  it("starts in idle state", () => {
    const { result } = renderHook(() => useInlineEdit());

    expect(result.current.editingField).toBeNull();
    expect(result.current.currentValue).toBeUndefined();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("startEdit sets field and value", () => {
    const { result } = renderHook(() => useInlineEdit());

    act(() => {
      result.current.startEdit("tasks", "task-1", "title", "Old title");
    });

    expect(result.current.editingField).toBe("title");
    expect(result.current.currentValue).toBe("Old title");
    expect(result.current.isDirty).toBe(false);
  });

  it("updateValue marks field as dirty", () => {
    const { result } = renderHook(() => useInlineEdit());

    act(() => {
      result.current.startEdit("tasks", "task-1", "title", "Old title");
    });
    act(() => {
      result.current.updateValue("New title");
    });

    expect(result.current.currentValue).toBe("New title");
    expect(result.current.isDirty).toBe(true);
  });

  it("cancelEdit resets to original value", () => {
    const { result } = renderHook(() => useInlineEdit());

    act(() => {
      result.current.startEdit("tasks", "task-1", "title", "Old title");
    });
    act(() => {
      result.current.updateValue("New title");
    });
    act(() => {
      result.current.cancelEdit();
    });

    expect(result.current.editingField).toBeNull();
    expect(result.current.currentValue).toBe("Old title");
    expect(result.current.isDirty).toBe(false);
  });

  it("saveEdit persists value and clears editing state", async () => {
    mockUpdate.mockResolvedValue(undefined);

    const { result } = renderHook(() => useInlineEdit());

    act(() => {
      result.current.startEdit("tasks", "task-1", "title", "Old title");
    });
    act(() => {
      result.current.updateValue("New title");
    });

    await act(async () => {
      await result.current.saveEdit();
    });

    expect(mockUpdate).toHaveBeenCalledWith("tasks", "task-1", {
      title: "New title",
    });
    expect(result.current.editingField).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles saveEdit error", async () => {
    mockUpdate.mockRejectedValue(new Error("Update failed"));

    const { result } = renderHook(() => useInlineEdit());

    act(() => {
      result.current.startEdit("tasks", "task-1", "title", "Old title");
    });
    act(() => {
      result.current.updateValue("New title");
    });

    await act(async () => {
      await expect(result.current.saveEdit()).rejects.toThrow("Update failed");
    });

    expect(result.current.editingField).toBe("title");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe("Update failed");
  });

  it("saveEdit is a no-op when not editing", async () => {
    const { result } = renderHook(() => useInlineEdit());

    await act(async () => {
      await result.current.saveEdit();
    });

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });
});
