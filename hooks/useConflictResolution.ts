import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ConflictField {
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  baseValue: unknown;
  resolution?: "local" | "remote" | "manual";
  manualValue?: unknown;
}

export interface Conflict {
  id: string;
  object: string;
  recordId: string;
  fields: ConflictField[];
  detectedAt: string;
  status: "pending" | "resolved" | "auto_resolved";
}

export type ResolutionStrategy = "local_wins" | "remote_wins" | "manual" | "latest_wins";

export interface UseConflictResolutionResult {
  /** Pending conflicts */
  conflicts: Conflict[];
  /** Resolved conflict count */
  resolvedCount: number;
  /** Set conflicts */
  setConflicts: (conflicts: Conflict[]) => void;
  /** Resolve a single field in a conflict */
  resolveField: (conflictId: string, field: string, resolution: "local" | "remote" | "manual", manualValue?: unknown) => void;
  /** Resolve all fields in a conflict using a strategy */
  resolveConflict: (conflictId: string, strategy: ResolutionStrategy) => void;
  /** Resolve all conflicts with a strategy */
  resolveAll: (strategy: ResolutionStrategy) => void;
  /** Dismiss a resolved conflict */
  dismissConflict: (conflictId: string) => void;
  /** Pending conflict count */
  pendingCount: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function applyStrategy(field: ConflictField, strategy: ResolutionStrategy): ConflictField {
  switch (strategy) {
    case "local_wins":
      return { ...field, resolution: "local" };
    case "remote_wins":
      return { ...field, resolution: "remote" };
    case "latest_wins":
      return { ...field, resolution: "remote" };
    case "manual":
    default:
      return field;
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for three-way merge conflict resolution in offline scenarios.
 *
 * Implements v1.6 Advanced Offline (three-way merge).
 *
 * ```ts
 * const { conflicts, resolveField, resolveAll, pendingCount } = useConflictResolution();
 * resolveField("conflict-1", "name", "local");
 * resolveAll("remote_wins");
 * ```
 */
export function useConflictResolution(): UseConflictResolutionResult {
  const [conflicts, setConflictsState] = useState<Conflict[]>([]);

  const pendingCount = useMemo(
    () => conflicts.filter((c) => c.status === "pending").length,
    [conflicts],
  );

  const resolvedCount = useMemo(
    () => conflicts.filter((c) => c.status === "resolved" || c.status === "auto_resolved").length,
    [conflicts],
  );

  const setConflicts = useCallback((items: Conflict[]) => {
    setConflictsState(items);
  }, []);

  const resolveField = useCallback(
    (conflictId: string, field: string, resolution: "local" | "remote" | "manual", manualValue?: unknown) => {
      setConflictsState((prev) =>
        prev.map((c) => {
          if (c.id !== conflictId) return c;
          const updatedFields = c.fields.map((f) =>
            f.field === field ? { ...f, resolution, manualValue } : f,
          );
          const allResolved = updatedFields.every((f) => f.resolution);
          return {
            ...c,
            fields: updatedFields,
            status: allResolved ? "resolved" as const : c.status,
          };
        }),
      );
    },
    [],
  );

  const resolveConflict = useCallback(
    (conflictId: string, strategy: ResolutionStrategy) => {
      setConflictsState((prev) =>
        prev.map((c) => {
          if (c.id !== conflictId) return c;
          return {
            ...c,
            fields: c.fields.map((f) => applyStrategy(f, strategy)),
            status: strategy === "manual" ? c.status : "resolved" as const,
          };
        }),
      );
    },
    [],
  );

  const resolveAll = useCallback((strategy: ResolutionStrategy) => {
    setConflictsState((prev) =>
      prev.map((c) => {
        if (c.status !== "pending") return c;
        return {
          ...c,
          fields: c.fields.map((f) => applyStrategy(f, strategy)),
          status: strategy === "manual" ? c.status : "resolved" as const,
        };
      }),
    );
  }, []);

  const dismissConflict = useCallback((conflictId: string) => {
    setConflictsState((prev) => prev.filter((c) => c.id !== conflictId));
  }, []);

  return {
    conflicts,
    resolvedCount,
    setConflicts,
    resolveField,
    resolveConflict,
    resolveAll,
    dismissConflict,
    pendingCount,
  };
}
