/**
 * Tests for useConflictResolution – validates three-way merge
 * conflict resolution with field-level and bulk operations.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useConflictResolution, Conflict } from "~/hooks/useConflictResolution";

const sampleConflicts: Conflict[] = [
  {
    id: "c-1",
    object: "contacts",
    recordId: "rec-1",
    fields: [
      { field: "name", localValue: "Alice", remoteValue: "Alice B.", baseValue: "Alice" },
      { field: "email", localValue: "alice@local.com", remoteValue: "alice@remote.com", baseValue: "alice@old.com" },
    ],
    detectedAt: "2026-01-01T00:00:00Z",
    status: "pending",
  },
  {
    id: "c-2",
    object: "tasks",
    recordId: "rec-2",
    fields: [
      { field: "status", localValue: "done", remoteValue: "in_progress", baseValue: "todo" },
    ],
    detectedAt: "2026-01-01T01:00:00Z",
    status: "pending",
  },
];

describe("useConflictResolution", () => {
  it("returns empty state initially", () => {
    const { result } = renderHook(() => useConflictResolution());

    expect(result.current.conflicts).toEqual([]);
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.resolvedCount).toBe(0);
  });

  it("sets conflicts and computes pending count", () => {
    const { result } = renderHook(() => useConflictResolution());

    act(() => {
      result.current.setConflicts(sampleConflicts);
    });

    expect(result.current.conflicts).toHaveLength(2);
    expect(result.current.pendingCount).toBe(2);
    expect(result.current.resolvedCount).toBe(0);
  });

  it("resolves a single field", () => {
    const { result } = renderHook(() => useConflictResolution());

    act(() => {
      result.current.setConflicts(sampleConflicts);
    });

    act(() => {
      result.current.resolveField("c-1", "name", "remote");
    });

    const conflict = result.current.conflicts.find((c) => c.id === "c-1")!;
    expect(conflict.fields[0].resolution).toBe("remote");
    expect(conflict.status).toBe("pending"); // not all fields resolved yet
  });

  it("resolves conflict when all fields resolved", () => {
    const { result } = renderHook(() => useConflictResolution());

    act(() => {
      result.current.setConflicts(sampleConflicts);
    });

    act(() => {
      result.current.resolveField("c-1", "name", "local");
    });
    act(() => {
      result.current.resolveField("c-1", "email", "remote");
    });

    const conflict = result.current.conflicts.find((c) => c.id === "c-1")!;
    expect(conflict.status).toBe("resolved");
    expect(result.current.resolvedCount).toBe(1);
    expect(result.current.pendingCount).toBe(1);
  });

  it("resolves a field with manual value", () => {
    const { result } = renderHook(() => useConflictResolution());

    act(() => {
      result.current.setConflicts(sampleConflicts);
    });

    act(() => {
      result.current.resolveField("c-1", "name", "manual", "Alice Custom");
    });

    const conflict = result.current.conflicts.find((c) => c.id === "c-1")!;
    expect(conflict.fields[0].resolution).toBe("manual");
    expect(conflict.fields[0].manualValue).toBe("Alice Custom");
  });

  it("resolves entire conflict with local_wins strategy", () => {
    const { result } = renderHook(() => useConflictResolution());

    act(() => {
      result.current.setConflicts(sampleConflicts);
    });

    act(() => {
      result.current.resolveConflict("c-1", "local_wins");
    });

    const conflict = result.current.conflicts.find((c) => c.id === "c-1")!;
    expect(conflict.status).toBe("resolved");
    expect(conflict.fields.every((f) => f.resolution === "local")).toBe(true);
    expect(result.current.pendingCount).toBe(1);
  });

  it("resolves all pending conflicts with remote_wins", () => {
    const { result } = renderHook(() => useConflictResolution());

    act(() => {
      result.current.setConflicts(sampleConflicts);
    });

    act(() => {
      result.current.resolveAll("remote_wins");
    });

    expect(result.current.pendingCount).toBe(0);
    expect(result.current.resolvedCount).toBe(2);
    expect(result.current.conflicts.every((c) => c.status === "resolved")).toBe(true);
  });

  it("dismisses a conflict", () => {
    const { result } = renderHook(() => useConflictResolution());

    act(() => {
      result.current.setConflicts(sampleConflicts);
    });

    act(() => {
      result.current.dismissConflict("c-1");
    });

    expect(result.current.conflicts).toHaveLength(1);
    expect(result.current.conflicts[0].id).toBe("c-2");
  });

  it("manual strategy does not auto-resolve", () => {
    const { result } = renderHook(() => useConflictResolution());

    act(() => {
      result.current.setConflicts(sampleConflicts);
    });

    act(() => {
      result.current.resolveConflict("c-1", "manual");
    });

    const conflict = result.current.conflicts.find((c) => c.id === "c-1")!;
    expect(conflict.status).toBe("pending");
  });
});
