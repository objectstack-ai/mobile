import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface RecentItem {
  id: string;
  object: string;
  recordId: string;
  title: string;
  subtitle?: string;
  accessedAt: string;
  icon?: string;
}

export interface UseRecentItemsResult {
  /** Recently accessed items */
  items: RecentItem[];
  /** Track access to an item */
  trackAccess: (item: Omit<RecentItem, "accessedAt">) => void;
  /** Clear all recent items */
  clearRecent: () => void;
  /** Remove a specific item by id */
  removeItem: (id: string) => void;
  /** Whether recent items are loading */
  isLoading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const MAX_RECENT_ITEMS = 50;

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for tracking recently accessed records (last 50).
 * Pure local state – no server calls needed.
 *
 * ```ts
 * const { items, trackAccess, clearRecent } = useRecentItems();
 * trackAccess({ id: "r-1", object: "tasks", recordId: "t-1", title: "My Task" });
 * ```
 */
export function useRecentItems(): UseRecentItemsResult {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [isLoading] = useState(false);

  const trackAccess = useCallback(
    (item: Omit<RecentItem, "accessedAt">): void => {
      setItems((prev) => {
        const filtered = prev.filter((i) => i.id !== item.id);
        const newItem: RecentItem = {
          ...item,
          accessedAt: new Date().toISOString(),
        };
        return [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
      });
    },
    [],
  );

  const clearRecent = useCallback(() => {
    setItems([]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { items, trackAccess, clearRecent, removeItem, isLoading };
}
