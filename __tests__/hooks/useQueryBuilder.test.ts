/**
 * Tests for useQueryBuilder – validates ObjectQL filter tree building,
 * manipulation, and serialization.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock query-builder helpers ---- */
let mockNextId = 0;
jest.mock("~/lib/query-builder", () => ({
  createSimpleFilter: (field: string, operator: string) => ({
    id: `filter-${++mockNextId}`,
    type: "simple",
    field,
    operator,
    value: "",
  }),
  createCompoundFilter: (logic: string) => ({
    id: `group-${++mockNextId}`,
    type: "compound",
    logic,
    filters: [],
  }),
  serializeFilterTree: jest.fn((root: any) => ({
    logic: root.logic,
    filters: root.filters.map((f: any) => ({
      field: f.field,
      operator: f.operator,
      value: f.value,
    })),
  })),
  buildProjection: jest.fn((fields: string[]) =>
    fields.length > 0 ? fields : ["*"],
  ),
  isCompoundFilter: (node: any) => node.type === "compound",
}));

import { useQueryBuilder } from "~/hooks/useQueryBuilder";

beforeEach(() => {
  mockNextId = 0;
});

describe("useQueryBuilder", () => {
  it("returns initial state with empty root", () => {
    const { result } = renderHook(() => useQueryBuilder());

    expect(result.current.root.logic).toBe("AND");
    expect(result.current.root.filters).toEqual([]);
    expect(result.current.globalSearch).toBe("");
    expect(result.current.selectedFields).toEqual([]);
    expect(result.current.hasFilters).toBe(false);
    expect(result.current.projection).toEqual(["*"]);
  });

  it("adds a simple filter", () => {
    const { result } = renderHook(() => useQueryBuilder());

    act(() => {
      result.current.addFilter("status", "eq");
    });

    expect(result.current.root.filters).toHaveLength(1);
    expect(result.current.root.filters[0]).toMatchObject({
      type: "simple",
      field: "status",
      operator: "eq",
    });
    expect(result.current.hasFilters).toBe(true);
  });

  it("adds multiple filters", () => {
    const { result } = renderHook(() => useQueryBuilder());

    act(() => {
      result.current.addFilter("status", "eq");
    });
    act(() => {
      result.current.addFilter("priority", "gt");
    });

    expect(result.current.root.filters).toHaveLength(2);
  });

  it("adds a nested compound group", () => {
    const { result } = renderHook(() => useQueryBuilder());

    act(() => {
      result.current.addGroup("OR");
    });

    expect(result.current.root.filters).toHaveLength(1);
    expect(result.current.root.filters[0]).toMatchObject({
      type: "compound",
      logic: "OR",
    });
  });

  it("removes a filter by id", () => {
    const { result } = renderHook(() => useQueryBuilder());

    act(() => {
      result.current.addFilter("name", "eq");
    });

    const filterId = result.current.root.filters[0].id;

    act(() => {
      result.current.removeFilter(filterId);
    });

    expect(result.current.root.filters).toHaveLength(0);
    expect(result.current.hasFilters).toBe(false);
  });

  it("updates a filter by id", () => {
    const { result } = renderHook(() => useQueryBuilder());

    act(() => {
      result.current.addFilter("status", "eq");
    });

    const filterId = result.current.root.filters[0].id;

    act(() => {
      result.current.updateFilter(filterId, {
        field: "status",
        operator: "neq" as any,
        value: "closed",
      } as any);
    });

    expect(result.current.root.filters[0]).toMatchObject({
      field: "status",
      operator: "neq",
      value: "closed",
    });
  });

  it("toggles root logic between AND and OR", () => {
    const { result } = renderHook(() => useQueryBuilder());

    expect(result.current.root.logic).toBe("AND");

    act(() => {
      result.current.toggleRootLogic();
    });

    expect(result.current.root.logic).toBe("OR");

    act(() => {
      result.current.toggleRootLogic();
    });

    expect(result.current.root.logic).toBe("AND");
  });

  it("clears all filters", () => {
    const { result } = renderHook(() => useQueryBuilder());

    act(() => {
      result.current.addFilter("status", "eq");
      result.current.addFilter("name", "contains" as any);
    });

    act(() => {
      result.current.setGlobalSearch("test");
    });

    expect(result.current.hasFilters).toBe(true);

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.root.filters).toHaveLength(0);
    expect(result.current.globalSearch).toBe("");
    expect(result.current.hasFilters).toBe(false);
  });

  it("serializes the filter tree", () => {
    const { result } = renderHook(() => useQueryBuilder());

    act(() => {
      result.current.addFilter("status", "eq");
    });

    const serialized = result.current.serialize();
    expect(serialized).toBeDefined();
    expect((serialized as any).logic).toBe("AND");
  });

  it("manages selected fields and projection", () => {
    const { result } = renderHook(() => useQueryBuilder());

    act(() => {
      result.current.setSelectedFields(["name", "status", "priority"]);
    });

    expect(result.current.selectedFields).toEqual([
      "name",
      "status",
      "priority",
    ]);
  });

  it("tracks globalSearch in hasFilters", () => {
    const { result } = renderHook(() => useQueryBuilder());

    expect(result.current.hasFilters).toBe(false);

    act(() => {
      result.current.setGlobalSearch("find me");
    });

    expect(result.current.hasFilters).toBe(true);
  });
});
