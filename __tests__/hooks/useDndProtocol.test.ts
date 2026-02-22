/**
 * Tests for useDndProtocol – validates drag-and-drop configuration,
 * drag state tracking, drop-zone validation, and drop-effect resolution.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useDndProtocol, DndConfig, DragItem } from "~/hooks/useDndProtocol";

const sampleConfig: DndConfig = {
  zones: [
    { id: "trash", accepts: ["card", "image"] },
    { id: "favorites", accepts: ["card"] },
  ],
  defaultDropEffect: "move",
};

const sampleItem: DragItem = { id: "c1", type: "card", data: { title: "Hello" } };

describe("useDndProtocol", () => {
  it("returns null/empty initial state", () => {
    const { result } = renderHook(() => useDndProtocol());

    expect(result.current.config).toBeNull();
    expect(result.current.activeItem).toBeNull();
    expect(result.current.activeZone).toBeNull();
    expect(result.current.isDragging).toBe(false);
  });

  it("sets config", () => {
    const { result } = renderHook(() => useDndProtocol());

    act(() => {
      result.current.setConfig(sampleConfig);
    });

    expect(result.current.config).toEqual(sampleConfig);
    expect(result.current.config!.zones).toHaveLength(2);
  });

  it("starts and ends a drag operation", () => {
    const { result } = renderHook(() => useDndProtocol());

    act(() => {
      result.current.startDrag(sampleItem);
    });

    expect(result.current.activeItem).toEqual(sampleItem);
    expect(result.current.isDragging).toBe(true);

    act(() => {
      result.current.endDrag();
    });

    expect(result.current.activeItem).toBeNull();
    expect(result.current.isDragging).toBe(false);
  });

  it("sets and clears the active zone", () => {
    const { result } = renderHook(() => useDndProtocol());

    act(() => {
      result.current.setActiveZone("trash");
    });

    expect(result.current.activeZone).toBe("trash");

    act(() => {
      result.current.setActiveZone(null);
    });

    expect(result.current.activeZone).toBeNull();
  });

  it("endDrag clears both activeItem and activeZone", () => {
    const { result } = renderHook(() => useDndProtocol());

    act(() => {
      result.current.startDrag(sampleItem);
      result.current.setActiveZone("trash");
    });

    act(() => {
      result.current.endDrag();
    });

    expect(result.current.activeItem).toBeNull();
    expect(result.current.activeZone).toBeNull();
  });

  it("canDrop returns true when zone accepts item type", () => {
    const { result } = renderHook(() => useDndProtocol());

    act(() => {
      result.current.setConfig(sampleConfig);
    });

    expect(result.current.canDrop("card", "trash")).toBe(true);
    expect(result.current.canDrop("image", "trash")).toBe(true);
    expect(result.current.canDrop("card", "favorites")).toBe(true);
  });

  it("canDrop returns false for unaccepted types or missing config", () => {
    const { result } = renderHook(() => useDndProtocol());

    // No config set
    expect(result.current.canDrop("card", "trash")).toBe(false);

    act(() => {
      result.current.setConfig(sampleConfig);
    });

    expect(result.current.canDrop("image", "favorites")).toBe(false);
    expect(result.current.canDrop("card", "nonexistent")).toBe(false);
  });

  it("getDropEffect returns configured effect or none", () => {
    const { result } = renderHook(() => useDndProtocol());

    // No config → "none"
    expect(result.current.getDropEffect("card", "trash")).toBe("none");

    act(() => {
      result.current.setConfig(sampleConfig);
    });

    expect(result.current.getDropEffect("card", "trash")).toBe("move");
    expect(result.current.getDropEffect("image", "favorites")).toBe("none");

    act(() => {
      result.current.setConfig({ zones: [{ id: "z", accepts: ["a"] }] });
    });

    // No defaultDropEffect → falls back to "move"
    expect(result.current.getDropEffect("a", "z")).toBe("move");
  });
});
