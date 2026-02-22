/**
 * Tests for useRecordRelatedList – validates related list configuration,
 * expand/collapse toggling, bulk expand/collapse, and isExpanded checks.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useRecordRelatedList, RelatedListConfig } from "~/hooks/useRecordRelatedList";

const sampleLists: RelatedListConfig[] = [
  { id: "r1", objectType: "Contact", label: "Contacts", fields: ["name", "email"] },
  { id: "r2", objectType: "Opportunity", label: "Opportunities", fields: ["name", "amount"], sortField: "amount", sortOrder: "desc" },
  { id: "r3", objectType: "Task", label: "Tasks", fields: ["subject", "status"], limit: 10 },
];

describe("useRecordRelatedList", () => {
  it("returns empty state initially", () => {
    const { result } = renderHook(() => useRecordRelatedList());

    expect(result.current.relatedLists).toEqual([]);
    expect(result.current.expanded.size).toBe(0);
  });

  it("sets related list configurations", () => {
    const { result } = renderHook(() => useRecordRelatedList());

    act(() => {
      result.current.setRelatedLists(sampleLists);
    });

    expect(result.current.relatedLists).toHaveLength(3);
    expect(result.current.relatedLists[0].label).toBe("Contacts");
  });

  it("toggles expand for a list", () => {
    const { result } = renderHook(() => useRecordRelatedList());

    act(() => {
      result.current.setRelatedLists(sampleLists);
    });

    expect(result.current.isExpanded("r1")).toBe(false);

    act(() => {
      result.current.toggleExpand("r1");
    });

    expect(result.current.isExpanded("r1")).toBe(true);

    act(() => {
      result.current.toggleExpand("r1");
    });

    expect(result.current.isExpanded("r1")).toBe(false);
  });

  it("expands all lists", () => {
    const { result } = renderHook(() => useRecordRelatedList());

    act(() => {
      result.current.setRelatedLists(sampleLists);
    });

    act(() => {
      result.current.expandAll();
    });

    expect(result.current.isExpanded("r1")).toBe(true);
    expect(result.current.isExpanded("r2")).toBe(true);
    expect(result.current.isExpanded("r3")).toBe(true);
    expect(result.current.expanded.size).toBe(3);
  });

  it("collapses all lists", () => {
    const { result } = renderHook(() => useRecordRelatedList());

    act(() => {
      result.current.setRelatedLists(sampleLists);
    });

    act(() => {
      result.current.expandAll();
    });

    act(() => {
      result.current.collapseAll();
    });

    expect(result.current.expanded.size).toBe(0);
    expect(result.current.isExpanded("r1")).toBe(false);
  });

  it("isExpanded returns false for unknown id", () => {
    const { result } = renderHook(() => useRecordRelatedList());

    expect(result.current.isExpanded("nonexistent")).toBe(false);
  });
});
