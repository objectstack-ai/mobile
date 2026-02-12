/**
 * Tests for useVoiceShortcuts – validates shortcut registration,
 * removal, default shortcuts, and isSupported flag.
 */
import { renderHook, act } from "@testing-library/react-native";

import { useVoiceShortcuts } from "~/hooks/useVoiceShortcuts";

describe("useVoiceShortcuts", () => {
  it("starts with no registered shortcuts", () => {
    const { result } = renderHook(() => useVoiceShortcuts());

    expect(result.current.shortcuts).toEqual([]);
    expect(result.current.isSupported).toBe(false);
  });

  it("exposes default shortcuts", () => {
    const { result } = renderHook(() => useVoiceShortcuts());

    expect(result.current.defaultShortcuts).toHaveLength(3);
    const ids = result.current.defaultShortcuts.map((s) => s.id);
    expect(ids).toEqual(["search", "create", "notifications"]);
  });

  it("default shortcuts are not registered", () => {
    const { result } = renderHook(() => useVoiceShortcuts());

    for (const s of result.current.defaultShortcuts) {
      expect(s.isRegistered).toBe(false);
    }
  });

  it("registerShortcut adds a shortcut as registered", async () => {
    const { result } = renderHook(() => useVoiceShortcuts());

    await act(async () => {
      await result.current.registerShortcut({
        id: "search",
        phrase: "Search ObjectStack",
        action: "search",
      });
    });

    expect(result.current.shortcuts).toHaveLength(1);
    expect(result.current.shortcuts[0].isRegistered).toBe(true);
    expect(result.current.shortcuts[0].phrase).toBe("Search ObjectStack");
  });

  it("registerShortcut updates existing shortcut with same id", async () => {
    const { result } = renderHook(() => useVoiceShortcuts());

    await act(async () => {
      await result.current.registerShortcut({
        id: "search",
        phrase: "Search ObjectStack",
        action: "search",
      });
    });

    await act(async () => {
      await result.current.registerShortcut({
        id: "search",
        phrase: "Find in ObjectStack",
        action: "search",
      });
    });

    expect(result.current.shortcuts).toHaveLength(1);
    expect(result.current.shortcuts[0].phrase).toBe("Find in ObjectStack");
  });

  it("registerShortcut supports params", async () => {
    const { result } = renderHook(() => useVoiceShortcuts());

    await act(async () => {
      await result.current.registerShortcut({
        id: "create",
        phrase: "Create new record",
        action: "create",
        params: { objectName: "tasks" },
      });
    });

    expect(result.current.shortcuts[0].params).toEqual({
      objectName: "tasks",
    });
  });

  it("removeShortcut removes by id", async () => {
    const { result } = renderHook(() => useVoiceShortcuts());

    await act(async () => {
      await result.current.registerShortcut({
        id: "search",
        phrase: "Search ObjectStack",
        action: "search",
      });
      await result.current.registerShortcut({
        id: "create",
        phrase: "Create new record",
        action: "create",
      });
    });

    await act(async () => {
      await result.current.removeShortcut("search");
    });

    expect(result.current.shortcuts).toHaveLength(1);
    expect(result.current.shortcuts[0].id).toBe("create");
  });
});
