/**
 * Tests for useRecordHighlights – validates highlight management,
 * adding, removing, reordering, and max visible capping.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useRecordHighlights, HighlightField } from "~/hooks/useRecordHighlights";

const sampleHighlights: HighlightField[] = [
  { id: "h1", fieldName: "revenue", label: "Revenue", value: 50000 },
  { id: "h2", fieldName: "employees", label: "Employees", value: 120 },
  { id: "h3", fieldName: "industry", label: "Industry", value: "Tech" },
  { id: "h4", fieldName: "stage", label: "Stage", value: "Growth" },
  { id: "h5", fieldName: "region", label: "Region", value: "NA" },
  { id: "h6", fieldName: "founded", label: "Founded", value: 2010, format: "year" },
];

describe("useRecordHighlights", () => {
  it("returns empty state initially", () => {
    const { result } = renderHook(() => useRecordHighlights());

    expect(result.current.highlights).toEqual([]);
    expect(result.current.maxVisible).toBe(5);
    expect(result.current.visibleHighlights).toEqual([]);
  });

  it("sets highlights and computes visible highlights", () => {
    const { result } = renderHook(() => useRecordHighlights());

    act(() => {
      result.current.setHighlights(sampleHighlights);
    });

    expect(result.current.highlights).toHaveLength(6);
    expect(result.current.visibleHighlights).toHaveLength(5);
  });

  it("adds a highlight", () => {
    const { result } = renderHook(() => useRecordHighlights());

    act(() => {
      result.current.addHighlight({ id: "h1", fieldName: "revenue", label: "Revenue", value: 50000 });
    });

    expect(result.current.highlights).toHaveLength(1);
    expect(result.current.highlights[0].fieldName).toBe("revenue");
  });

  it("removes a highlight by id", () => {
    const { result } = renderHook(() => useRecordHighlights());

    act(() => {
      result.current.setHighlights(sampleHighlights);
    });

    act(() => {
      result.current.removeHighlight("h3");
    });

    expect(result.current.highlights).toHaveLength(5);
    expect(result.current.highlights.find((h) => h.id === "h3")).toBeUndefined();
  });

  it("reorders highlights by id array", () => {
    const { result } = renderHook(() => useRecordHighlights());

    act(() => {
      result.current.setHighlights(sampleHighlights.slice(0, 3));
    });

    act(() => {
      result.current.reorderHighlights(["h3", "h1", "h2"]);
    });

    const ids = result.current.highlights.map((h) => h.id);
    expect(ids).toEqual(["h3", "h1", "h2"]);
  });

  it("reorder appends items not in orderedIds list", () => {
    const { result } = renderHook(() => useRecordHighlights());

    act(() => {
      result.current.setHighlights(sampleHighlights.slice(0, 3));
    });

    act(() => {
      result.current.reorderHighlights(["h2"]);
    });

    const ids = result.current.highlights.map((h) => h.id);
    expect(ids).toEqual(["h2", "h1", "h3"]);
  });

  it("caps visible highlights based on maxVisible", () => {
    const { result } = renderHook(() => useRecordHighlights());

    act(() => {
      result.current.setHighlights(sampleHighlights);
    });

    act(() => {
      result.current.setMaxVisible(2);
    });

    expect(result.current.visibleHighlights).toHaveLength(2);
    expect(result.current.maxVisible).toBe(2);
  });
});
