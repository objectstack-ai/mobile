/**
 * Tests for useInterfacePageConfig – validates page configuration management,
 * block addition, removal, reordering, and updates.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useInterfacePageConfig, PageBlock } from "~/hooks/useInterfacePageConfig";

describe("useInterfacePageConfig", () => {
  it("returns default empty state initially", () => {
    const { result } = renderHook(() => useInterfacePageConfig());

    expect(result.current.config).toEqual({ id: "", title: "", blocks: [] });
    expect(result.current.blocks).toEqual([]);
  });

  it("sets full page configuration", () => {
    const { result } = renderHook(() => useInterfacePageConfig());

    act(() => {
      result.current.setConfig({
        id: "p1",
        title: "Dashboard",
        description: "Main dashboard",
        blocks: [{ id: "b1", type: "chart", config: {}, order: 0 }],
      });
    });

    expect(result.current.config.title).toBe("Dashboard");
    expect(result.current.blocks).toHaveLength(1);
  });

  it("adds a block sorted by order", () => {
    const { result } = renderHook(() => useInterfacePageConfig());

    act(() => {
      result.current.setConfig({ id: "p1", title: "Page", blocks: [] });
    });

    act(() => {
      result.current.addBlock({ id: "b2", type: "table", config: {}, order: 2 });
    });

    act(() => {
      result.current.addBlock({ id: "b1", type: "chart", config: {}, order: 1 });
    });

    expect(result.current.blocks).toHaveLength(2);
    expect(result.current.blocks[0].id).toBe("b1");
    expect(result.current.blocks[1].id).toBe("b2");
  });

  it("removes a block by id", () => {
    const { result } = renderHook(() => useInterfacePageConfig());

    act(() => {
      result.current.setConfig({
        id: "p1",
        title: "Page",
        blocks: [
          { id: "b1", type: "chart", config: {}, order: 0 },
          { id: "b2", type: "table", config: {}, order: 1 },
        ],
      });
    });

    act(() => {
      result.current.removeBlock("b1");
    });

    expect(result.current.blocks).toHaveLength(1);
    expect(result.current.blocks[0].id).toBe("b2");
  });

  it("moves a block to a new order", () => {
    const { result } = renderHook(() => useInterfacePageConfig());

    act(() => {
      result.current.setConfig({
        id: "p1",
        title: "Page",
        blocks: [
          { id: "b1", type: "chart", config: {}, order: 0 },
          { id: "b2", type: "table", config: {}, order: 1 },
          { id: "b3", type: "text", config: {}, order: 2 },
        ],
      });
    });

    act(() => {
      result.current.moveBlock("b1", 5);
    });

    expect(result.current.blocks[0].id).toBe("b2");
    expect(result.current.blocks[2].id).toBe("b1");
    expect(result.current.blocks[2].order).toBe(5);
  });

  it("updates a block's configuration", () => {
    const { result } = renderHook(() => useInterfacePageConfig());

    act(() => {
      result.current.setConfig({
        id: "p1",
        title: "Page",
        blocks: [{ id: "b1", type: "chart", config: { color: "blue" }, order: 0 }],
      });
    });

    act(() => {
      result.current.updateBlock("b1", { config: { color: "red" } });
    });

    expect(result.current.blocks[0].config).toEqual({ color: "red" });
  });

  it("updates a block's type without affecting other fields", () => {
    const { result } = renderHook(() => useInterfacePageConfig());

    act(() => {
      result.current.setConfig({
        id: "p1",
        title: "Page",
        blocks: [{ id: "b1", type: "chart", config: { color: "blue" }, order: 0 }],
      });
    });

    act(() => {
      result.current.updateBlock("b1", { type: "pie-chart" });
    });

    expect(result.current.blocks[0].type).toBe("pie-chart");
    expect(result.current.blocks[0].config).toEqual({ color: "blue" });
  });
});
