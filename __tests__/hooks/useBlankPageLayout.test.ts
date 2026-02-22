/**
 * Tests for useBlankPageLayout – validates blank page layout management,
 * item addition, removal, reordering, updates, and template selection.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useBlankPageLayout, LayoutItem } from "~/hooks/useBlankPageLayout";

describe("useBlankPageLayout", () => {
  it("returns default state initially", () => {
    const { result } = renderHook(() => useBlankPageLayout());

    expect(result.current.items).toEqual([]);
    expect(result.current.template).toBe("blank");
  });

  it("sets layout items", () => {
    const { result } = renderHook(() => useBlankPageLayout());

    const items: LayoutItem[] = [
      { id: "i1", type: "text", config: { content: "Hello" }, order: 0 },
      { id: "i2", type: "image", config: { src: "img.png" }, order: 1 },
    ];

    act(() => {
      result.current.setItems(items);
    });

    expect(result.current.items).toHaveLength(2);
  });

  it("adds an item sorted by order", () => {
    const { result } = renderHook(() => useBlankPageLayout());

    act(() => {
      result.current.addItem({ id: "i2", type: "image", config: {}, order: 2 });
    });

    act(() => {
      result.current.addItem({ id: "i1", type: "text", config: {}, order: 1 });
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0].id).toBe("i1");
    expect(result.current.items[1].id).toBe("i2");
  });

  it("removes an item by id", () => {
    const { result } = renderHook(() => useBlankPageLayout());

    act(() => {
      result.current.setItems([
        { id: "i1", type: "text", config: {}, order: 0 },
        { id: "i2", type: "image", config: {}, order: 1 },
      ]);
    });

    act(() => {
      result.current.removeItem("i1");
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe("i2");
  });

  it("moves an item to a new order", () => {
    const { result } = renderHook(() => useBlankPageLayout());

    act(() => {
      result.current.setItems([
        { id: "i1", type: "text", config: {}, order: 0 },
        { id: "i2", type: "image", config: {}, order: 1 },
        { id: "i3", type: "video", config: {}, order: 2 },
      ]);
    });

    act(() => {
      result.current.moveItem("i1", 5);
    });

    expect(result.current.items[0].id).toBe("i2");
    expect(result.current.items[2].id).toBe("i1");
    expect(result.current.items[2].order).toBe(5);
  });

  it("updates an item's configuration", () => {
    const { result } = renderHook(() => useBlankPageLayout());

    act(() => {
      result.current.setItems([
        { id: "i1", type: "text", config: { content: "Hello" }, order: 0 },
      ]);
    });

    act(() => {
      result.current.updateItem("i1", { config: { content: "Updated" } });
    });

    expect(result.current.items[0].config).toEqual({ content: "Updated" });
  });

  it("sets the template type", () => {
    const { result } = renderHook(() => useBlankPageLayout());

    act(() => {
      result.current.setTemplate("dashboard");
    });

    expect(result.current.template).toBe("dashboard");
  });

  it("changes template without affecting items", () => {
    const { result } = renderHook(() => useBlankPageLayout());

    act(() => {
      result.current.addItem({ id: "i1", type: "text", config: {}, order: 0 });
    });

    act(() => {
      result.current.setTemplate("form");
    });

    expect(result.current.template).toBe("form");
    expect(result.current.items).toHaveLength(1);
  });
});
