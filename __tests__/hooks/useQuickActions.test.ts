/**
 * Tests for useQuickActions – validates default actions,
 * registration, removal, and execution.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK (not used but required by module system) ---- */
jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({}),
}));

import { useQuickActions } from "~/hooks/useQuickActions";

describe("useQuickActions", () => {
  it("starts with default actions", () => {
    const { result } = renderHook(() => useQuickActions());

    expect(result.current.actions).toHaveLength(3);
    expect(result.current.actions.map((a) => a.id)).toEqual([
      "new-record",
      "search",
      "scan",
    ]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("registerAction adds a new action", () => {
    const { result } = renderHook(() => useQuickActions());

    act(() => {
      result.current.registerAction({
        id: "import",
        label: "Import",
        icon: "upload",
        type: "custom",
      });
    });

    expect(result.current.actions).toHaveLength(4);
    expect(result.current.actions[3].id).toBe("import");
  });

  it("registerAction updates existing action with same id", () => {
    const { result } = renderHook(() => useQuickActions());

    act(() => {
      result.current.registerAction({
        id: "search",
        label: "Global Search",
        icon: "magnify",
        type: "search",
      });
    });

    expect(result.current.actions).toHaveLength(3);
    const searchAction = result.current.actions.find((a) => a.id === "search");
    expect(searchAction?.label).toBe("Global Search");
    expect(searchAction?.icon).toBe("magnify");
  });

  it("removeAction removes by id", () => {
    const { result } = renderHook(() => useQuickActions());

    act(() => {
      result.current.removeAction("scan");
    });

    expect(result.current.actions).toHaveLength(2);
    expect(result.current.actions.find((a) => a.id === "scan")).toBeUndefined();
  });

  it("executeAction calls onExecute for matching action", async () => {
    const onExecute = jest.fn();
    const { result } = renderHook(() => useQuickActions());

    act(() => {
      result.current.registerAction({
        id: "custom",
        label: "Custom",
        icon: "star",
        type: "custom",
        onExecute,
      });
    });

    await act(async () => {
      await result.current.executeAction("custom");
    });

    expect(onExecute).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("executeAction throws for unknown action id", async () => {
    const { result } = renderHook(() => useQuickActions());

    await act(async () => {
      await expect(
        result.current.executeAction("nonexistent"),
      ).rejects.toThrow("Action not found: nonexistent");
    });

    expect(result.current.error?.message).toBe(
      "Action not found: nonexistent",
    );
  });

  it("executeAction handles action without onExecute", async () => {
    const { result } = renderHook(() => useQuickActions());

    await act(async () => {
      await result.current.executeAction("new-record");
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("executeAction handles onExecute error", async () => {
    const { result } = renderHook(() => useQuickActions());

    act(() => {
      result.current.registerAction({
        id: "failing",
        label: "Failing",
        icon: "alert",
        type: "custom",
        onExecute: () => {
          throw new Error("Execution failed");
        },
      });
    });

    await act(async () => {
      await expect(
        result.current.executeAction("failing"),
      ).rejects.toThrow("Execution failed");
    });

    expect(result.current.error?.message).toBe("Execution failed");
  });
});
