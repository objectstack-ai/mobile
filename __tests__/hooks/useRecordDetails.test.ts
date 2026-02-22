/**
 * Tests for useRecordDetails – validates section management,
 * field visibility toggling, tab navigation, and computed visible fields.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useRecordDetails, RecordDetailsSection } from "~/hooks/useRecordDetails";

const sampleSections: RecordDetailsSection[] = [
  {
    id: "s1",
    title: "Info",
    columns: 2,
    fields: [
      { id: "f1", name: "Name", type: "text", visible: true, required: true },
      { id: "f2", name: "Email", type: "email", visible: true },
      { id: "f3", name: "Phone", type: "phone", visible: false },
    ],
  },
  {
    id: "s2",
    title: "Details",
    columns: 1,
    fields: [
      { id: "f4", name: "Address", type: "text", visible: true },
      { id: "f5", name: "Notes", type: "textarea", visible: false, readOnly: true },
    ],
  },
];

describe("useRecordDetails", () => {
  it("returns empty state initially", () => {
    const { result } = renderHook(() => useRecordDetails());

    expect(result.current.sections).toEqual([]);
    expect(result.current.activeTab).toBe("");
  });

  it("sets sections", () => {
    const { result } = renderHook(() => useRecordDetails());

    act(() => {
      result.current.setSections(sampleSections);
    });

    expect(result.current.sections).toHaveLength(2);
    expect(result.current.sections[0].title).toBe("Info");
  });

  it("sets the active tab", () => {
    const { result } = renderHook(() => useRecordDetails());

    act(() => {
      result.current.setActiveTab("details");
    });

    expect(result.current.activeTab).toBe("details");
  });

  it("toggles field visibility", () => {
    const { result } = renderHook(() => useRecordDetails());

    act(() => {
      result.current.setSections(sampleSections);
    });

    // f3 starts as not visible
    expect(result.current.sections[0].fields[2].visible).toBe(false);

    act(() => {
      result.current.toggleFieldVisibility("s1", "f3");
    });

    expect(result.current.sections[0].fields[2].visible).toBe(true);
  });

  it("toggles visible field back to hidden", () => {
    const { result } = renderHook(() => useRecordDetails());

    act(() => {
      result.current.setSections(sampleSections);
    });

    act(() => {
      result.current.toggleFieldVisibility("s1", "f1");
    });

    expect(result.current.sections[0].fields[0].visible).toBe(false);
  });

  it("returns visible fields for a section", () => {
    const { result } = renderHook(() => useRecordDetails());

    act(() => {
      result.current.setSections(sampleSections);
    });

    const visible = result.current.getVisibleFields("s1");
    expect(visible).toHaveLength(2);
    expect(visible.map((f) => f.id)).toEqual(["f1", "f2"]);
  });

  it("returns empty array for unknown section", () => {
    const { result } = renderHook(() => useRecordDetails());

    act(() => {
      result.current.setSections(sampleSections);
    });

    expect(result.current.getVisibleFields("unknown")).toEqual([]);
  });
});
