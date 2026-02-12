/**
 * Tests for useUndoRedo – validates undo stack management,
 * undo execution, and dismiss behavior.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK (not used but required by module system) ---- */
jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({}),
}));

import { useUndoRedo } from "~/hooks/useUndoRedo";

describe("useUndoRedo", () => {
  it("starts with empty stack", () => {
    const { result } = renderHook(() => useUndoRedo());

    expect(result.current.canUndo).toBe(false);
    expect(result.current.lastAction).toBeNull();
    expect(result.current.isUndoing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("pushAction adds action to stack", () => {
    const { result } = renderHook(() => useUndoRedo());

    act(() => {
      result.current.pushAction({
        description: "Deleted record",
        undo: jest.fn(),
      });
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.lastAction).not.toBeNull();
    expect(result.current.lastAction?.description).toBe("Deleted record");
    expect(result.current.lastAction?.id).toMatch(/^undo-/);
    expect(typeof result.current.lastAction?.timestamp).toBe("number");
  });

  it("pushAction stacks multiple actions", () => {
    const { result } = renderHook(() => useUndoRedo());

    act(() => {
      result.current.pushAction({
        description: "Action 1",
        undo: jest.fn(),
      });
    });
    act(() => {
      result.current.pushAction({
        description: "Action 2",
        undo: jest.fn(),
      });
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.lastAction?.description).toBe("Action 2");
  });

  it("undo calls the last action's undo function", async () => {
    const undoFn = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useUndoRedo());

    act(() => {
      result.current.pushAction({
        description: "Deleted record",
        undo: undoFn,
      });
    });

    await act(async () => {
      await result.current.undo();
    });

    expect(undoFn).toHaveBeenCalledTimes(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.lastAction).toBeNull();
    expect(result.current.isUndoing).toBe(false);
  });

  it("undo removes only the last action", async () => {
    const undoFn1 = jest.fn().mockResolvedValue(undefined);
    const undoFn2 = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useUndoRedo());

    act(() => {
      result.current.pushAction({ description: "Action 1", undo: undoFn1 });
    });
    act(() => {
      result.current.pushAction({ description: "Action 2", undo: undoFn2 });
    });

    await act(async () => {
      await result.current.undo();
    });

    expect(undoFn2).toHaveBeenCalledTimes(1);
    expect(undoFn1).not.toHaveBeenCalled();
    expect(result.current.canUndo).toBe(true);
    expect(result.current.lastAction?.description).toBe("Action 1");
  });

  it("handles undo error", async () => {
    const undoFn = jest.fn().mockRejectedValue(new Error("Undo failed"));
    const { result } = renderHook(() => useUndoRedo());

    act(() => {
      result.current.pushAction({
        description: "Deleted record",
        undo: undoFn,
      });
    });

    await act(async () => {
      await expect(result.current.undo()).rejects.toThrow("Undo failed");
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.isUndoing).toBe(false);
    expect(result.current.error?.message).toBe("Undo failed");
  });

  it("undo is a no-op when stack is empty", async () => {
    const { result } = renderHook(() => useUndoRedo());

    await act(async () => {
      await result.current.undo();
    });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.isUndoing).toBe(false);
  });

  it("dismiss removes last action without undoing", () => {
    const undoFn = jest.fn();
    const { result } = renderHook(() => useUndoRedo());

    act(() => {
      result.current.pushAction({
        description: "Deleted record",
        undo: undoFn,
      });
    });

    act(() => {
      result.current.dismiss();
    });

    expect(undoFn).not.toHaveBeenCalled();
    expect(result.current.canUndo).toBe(false);
    expect(result.current.lastAction).toBeNull();
  });
});
