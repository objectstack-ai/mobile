/**
 * Tests for useFormDraft – validates draft save/load/discard,
 * dirty state, and completion percentage calculation.
 */
import { renderHook, act } from "@testing-library/react-native";

jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({}),
}));

import { useFormDraft } from "~/hooks/useFormDraft";

describe("useFormDraft", () => {
  it("starts with no draft and not dirty", () => {
    const { result } = renderHook(() => useFormDraft());

    expect(result.current.draft).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.completionPercent).toBe(0);
  });

  it("saveDraft stores a draft and marks dirty", () => {
    const { result } = renderHook(() => useFormDraft());

    act(() => {
      result.current.saveDraft("tasks", { title: "Test" });
    });

    expect(result.current.draft).not.toBeNull();
    expect(result.current.draft!.objectName).toBe("tasks");
    expect(result.current.draft!.values).toEqual({ title: "Test" });
    expect(result.current.draft!.savedAt).toBeGreaterThan(0);
    expect(result.current.isDirty).toBe(true);
  });

  it("saveDraft with recordId", () => {
    const { result } = renderHook(() => useFormDraft());

    act(() => {
      result.current.saveDraft("tasks", { title: "Edit" }, "task-1");
    });

    expect(result.current.draft!.objectName).toBe("tasks");
    expect(result.current.draft!.recordId).toBe("task-1");
    expect(result.current.draft!.values).toEqual({ title: "Edit" });
  });

  it("loadDraft retrieves a saved draft", () => {
    const { result } = renderHook(() => useFormDraft());

    act(() => {
      result.current.saveDraft("tasks", { title: "Draft" });
    });

    let loaded: unknown;
    act(() => {
      loaded = result.current.loadDraft("tasks");
    });

    expect(loaded).not.toBeNull();
    expect((loaded as any).values).toEqual({ title: "Draft" });
  });

  it("loadDraft returns null for missing draft", () => {
    const { result } = renderHook(() => useFormDraft());

    let loaded: unknown;
    act(() => {
      loaded = result.current.loadDraft("nonexistent");
    });

    expect(loaded).toBeNull();
    expect(result.current.draft).toBeNull();
  });

  it("discardDraft removes the draft", () => {
    const { result } = renderHook(() => useFormDraft());

    act(() => {
      result.current.saveDraft("tasks", { title: "To discard" });
    });
    expect(result.current.hasDraft("tasks")).toBe(true);

    act(() => {
      result.current.discardDraft("tasks");
    });

    expect(result.current.draft).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.hasDraft("tasks")).toBe(false);
  });

  it("hasDraft returns correct boolean", () => {
    const { result } = renderHook(() => useFormDraft());

    expect(result.current.hasDraft("tasks")).toBe(false);

    act(() => {
      result.current.saveDraft("tasks", { title: "Yes" });
    });

    expect(result.current.hasDraft("tasks")).toBe(true);
    expect(result.current.hasDraft("other")).toBe(false);
  });

  it("completionPercent reflects filled fields", () => {
    const { result } = renderHook(() => useFormDraft());

    act(() => {
      result.current.setFieldCount(4);
    });

    act(() => {
      result.current.saveDraft("tasks", {
        title: "Hi",
        description: "",
        status: "open",
        priority: null,
      });
    });

    // 2 of 4 fields filled (description="" and priority=null are empty)
    expect(result.current.completionPercent).toBe(50);
  });

  it("completionPercent is 0 when fieldCount is 0", () => {
    const { result } = renderHook(() => useFormDraft());

    act(() => {
      result.current.saveDraft("tasks", { title: "Hi" });
    });

    expect(result.current.completionPercent).toBe(0);
  });

  it("isDirty is false when draft has empty values", () => {
    const { result } = renderHook(() => useFormDraft());

    act(() => {
      result.current.saveDraft("tasks", {});
    });

    expect(result.current.isDirty).toBe(false);
  });

  it("handles multiple drafts independently", () => {
    const { result } = renderHook(() => useFormDraft());

    act(() => {
      result.current.saveDraft("tasks", { title: "Task" });
    });
    act(() => {
      result.current.saveDraft("contacts", { name: "John" });
    });

    expect(result.current.hasDraft("tasks")).toBe(true);
    expect(result.current.hasDraft("contacts")).toBe(true);

    act(() => {
      result.current.discardDraft("tasks");
    });

    expect(result.current.hasDraft("tasks")).toBe(false);
    expect(result.current.hasDraft("contacts")).toBe(true);
  });
});
