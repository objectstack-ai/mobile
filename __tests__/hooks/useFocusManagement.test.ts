/**
 * Tests for useFocusManagement – validates focus traps,
 * element registration, and navigation.
 */
import { renderHook, act } from "@testing-library/react-native";
import {
  useFocusManagement,
  FocusTrapConfig,
  FocusableElement,
} from "~/hooks/useFocusManagement";

const sampleTrap: FocusTrapConfig = {
  id: "dialog",
  enabled: true,
  autoFocus: true,
  restoreFocus: true,
};

const sampleElements: FocusableElement[] = [
  { id: "btn1", order: 1, group: "dialog" },
  { id: "btn2", order: 2, group: "dialog" },
  { id: "btn3", order: 3, group: "dialog", disabled: true },
  { id: "btn4", order: 0, group: "other" },
];

describe("useFocusManagement", () => {
  it("returns empty state initially", () => {
    const { result } = renderHook(() => useFocusManagement());

    expect(result.current.traps.size).toBe(0);
    expect(result.current.focusableElements).toEqual([]);
    expect(result.current.activeTrapId).toBeNull();
    expect(result.current.focusedElementId).toBeNull();
    expect(result.current.activeElements).toEqual([]);
  });

  it("registers and unregisters traps", () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.registerTrap(sampleTrap);
    });

    expect(result.current.traps.size).toBe(1);
    expect(result.current.traps.get("dialog")).toEqual(sampleTrap);

    act(() => {
      result.current.unregisterTrap("dialog");
    });

    expect(result.current.traps.size).toBe(0);
  });

  it("activates and deactivates traps", () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.registerTrap(sampleTrap);
      result.current.activateTrap("dialog");
    });

    expect(result.current.activeTrapId).toBe("dialog");

    act(() => {
      result.current.deactivateTrap();
    });

    expect(result.current.activeTrapId).toBeNull();
  });

  it("registers elements and computes active elements for trap group", () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.registerTrap(sampleTrap);
      sampleElements.forEach((el) => result.current.registerElement(el));
      result.current.activateTrap("dialog");
    });

    const ids = result.current.activeElements.map((e) => e.id);
    expect(ids).toEqual(["btn1", "btn2"]);
  });

  it("navigates focus forward and backward", () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.registerTrap(sampleTrap);
      sampleElements.forEach((el) => result.current.registerElement(el));
      result.current.activateTrap("dialog");
      result.current.focusElement("btn1");
    });

    expect(result.current.focusedElementId).toBe("btn1");

    act(() => {
      result.current.focusNext();
    });

    expect(result.current.focusedElementId).toBe("btn2");

    act(() => {
      result.current.focusPrevious();
    });

    expect(result.current.focusedElementId).toBe("btn1");
  });

  it("wraps around when navigating past last element", () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.registerTrap(sampleTrap);
      sampleElements.forEach((el) => result.current.registerElement(el));
      result.current.activateTrap("dialog");
      result.current.focusElement("btn2");
    });

    act(() => {
      result.current.focusNext();
    });

    expect(result.current.focusedElementId).toBe("btn1");
  });

  it("unregisters element and clears focused id if it was focused", () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.registerElement(sampleElements[0]);
      result.current.focusElement("btn1");
    });

    expect(result.current.focusedElementId).toBe("btn1");

    act(() => {
      result.current.unregisterElement("btn1");
    });

    expect(result.current.focusedElementId).toBeNull();
  });
});
