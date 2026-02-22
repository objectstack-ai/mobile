import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ActivityEntry {
  id: string;
  type: string;
  user: string;
  summary: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface ActivityFilter {
  type?: string;
  user?: string;
  dateRange?: { start: string; end: string };
}

export type SortOrder = "asc" | "desc";

export interface RecordActivityProps {
  activities?: ActivityEntry[];
  filter?: ActivityFilter;
  sortOrder?: SortOrder;
}

export interface UseRecordActivityResult {
  /** All activity entries */
  activities: ActivityEntry[];
  /** Current filter */
  filter: ActivityFilter;
  /** Current sort order */
  sortOrder: SortOrder;
  /** Filtered and sorted activities */
  filteredActivities: ActivityEntry[];
  /** Set all activities */
  setActivities: (activities: ActivityEntry[]) => void;
  /** Add a single activity entry */
  addActivity: (activity: ActivityEntry) => void;
  /** Update the filter */
  setFilter: (filter: ActivityFilter) => void;
  /** Update the sort order */
  setSortOrder: (order: SortOrder) => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for managing the activity timeline on SDUI record pages —
 * filtering by type, user, date range, and sorting.
 *
 * Implements Phase 23 SDUI Record Page Protocol.
 *
 * ```ts
 * const { filteredActivities, addActivity, setFilter, setSortOrder } =
 *   useRecordActivity();
 * addActivity({ id: "a1", type: "update", user: "u1", summary: "Edited name", timestamp: "2025-01-01" });
 * setFilter({ type: "update" });
 * setSortOrder("desc");
 * ```
 */
export function useRecordActivity(
  _props?: RecordActivityProps,
): UseRecordActivityResult {
  const [activities, setActivitiesState] = useState<ActivityEntry[]>([]);
  const [filter, setFilterState] = useState<ActivityFilter>({});
  const [sortOrder, setSortOrderState] = useState<SortOrder>("desc");

  const filteredActivities = useMemo(() => {
    let items = [...activities];

    if (filter.type) {
      items = items.filter((a) => a.type === filter.type);
    }
    if (filter.user) {
      items = items.filter((a) => a.user === filter.user);
    }
    if (filter.dateRange) {
      const { start, end } = filter.dateRange;
      items = items.filter((a) => a.timestamp >= start && a.timestamp <= end);
    }

    items.sort((a, b) => {
      const cmp = a.timestamp.localeCompare(b.timestamp);
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return items;
  }, [activities, filter, sortOrder]);

  const setActivities = useCallback((items: ActivityEntry[]) => {
    setActivitiesState(items);
  }, []);

  const addActivity = useCallback((activity: ActivityEntry) => {
    setActivitiesState((prev) => [...prev, activity]);
  }, []);

  const setFilter = useCallback((f: ActivityFilter) => {
    setFilterState(f);
  }, []);

  const setSortOrder = useCallback((order: SortOrder) => {
    setSortOrderState(order);
  }, []);

  return {
    activities,
    filter,
    sortOrder,
    filteredActivities,
    setActivities,
    addActivity,
    setFilter,
    setSortOrder,
  };
}
