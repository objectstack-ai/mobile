/**
 * Tests for useKeyboardNavigation – validates shortcut registration,
 * key matching, and enable/disable logic.
 */
import { renderHook, act } from "@testing-library/react-native";
import {
  useKeyboardNavigation,
  KeyboardShortcut,
} from "~/hooks/useKeyboardNavigation";

const sampleShortcut: KeyboardShortcut = {
  id: "save",
  key: "s",
  modifiers: ["ctrl"],
  action: "save",
  description: "Save record",
  enabled: true,
};

describe("useKeyboardNavigation", () => {
  it("returns empty state initially", () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    expect(result.current.config.enabled).toBe(false);
    expect(result.current.shortcuts.size).toBe(0);
    expect(result.current.activeShortcutId).toBeNull();
    expect(result.current.enabledShortcuts).toEqual([]);
  });

  it("registers and unregisters shortcuts", () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    act(() => {
      result.current.registerShortcut(sampleShortcut);
    });

    expect(result.current.shortcuts.size).toBe(1);
    expect(result.current.enabledShortcuts).toHaveLength(1);

    act(() => {
      result.current.unregisterShortcut("save");
    });

    expect(result.current.shortcuts.size).toBe(0);
  });

  it("enables and disables shortcuts", () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    act(() => {
      result.current.registerShortcut(sampleShortcut);
    });

    act(() => {
      result.current.disableShortcut("save");
    });

    expect(result.current.enabledShortcuts).toHaveLength(0);

    act(() => {
      result.current.enableShortcut("save");
    });

    expect(result.current.enabledShortcuts).toHaveLength(1);
  });

  it("matches key press when config is enabled", () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    act(() => {
      result.current.setConfig({
        enabled: true,
        shortcuts: [],
        tabNavigation: true,
        arrowNavigation: true,
      });
      result.current.registerShortcut(sampleShortcut);
    });

    let matched: KeyboardShortcut | null = null;
    act(() => {
      matched = result.current.handleKeyPress("s", ["ctrl"]);
    });

    expect(matched).not.toBeNull();
    expect(matched!.id).toBe("save");
    expect(result.current.activeShortcutId).toBe("save");
  });

  it("returns null when config is disabled", () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    act(() => {
      result.current.registerShortcut(sampleShortcut);
    });

    let matched: KeyboardShortcut | null = null;
    act(() => {
      matched = result.current.handleKeyPress("s", ["ctrl"]);
    });

    expect(matched).toBeNull();
  });

  it("returns null for non-matching key press", () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    act(() => {
      result.current.setConfig({
        enabled: true,
        shortcuts: [],
        tabNavigation: true,
        arrowNavigation: true,
      });
      result.current.registerShortcut(sampleShortcut);
    });

    let matched: KeyboardShortcut | null = null;
    act(() => {
      matched = result.current.handleKeyPress("x", ["ctrl"]);
    });

    expect(matched).toBeNull();
  });
});
