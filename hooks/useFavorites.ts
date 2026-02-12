import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface FavoriteItem {
  id: string;
  type: "record" | "dashboard" | "report" | "view";
  objectName?: string;
  recordId?: string;
  title: string;
  pinnedAt: string;
}

export interface UseFavoritesResult {
  /** Current favorite items */
  favorites: FavoriteItem[];
  /** Add an item to favorites */
  addFavorite: (item: Omit<FavoriteItem, "pinnedAt">) => void;
  /** Remove a favorite by id */
  removeFavorite: (id: string) => void;
  /** Check whether an item is favorited */
  isFavorite: (id: string) => boolean;
  /** Toggle favorite state for an item */
  toggleFavorite: (item: Omit<FavoriteItem, "pinnedAt">) => void;
  /** Whether favorites are loading */
  isLoading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for pinning/unpinning records, dashboards, reports, and views.
 * Pure local state management.
 *
 * ```ts
 * const { favorites, addFavorite, isFavorite, toggleFavorite } = useFavorites();
 * toggleFavorite({ id: "d-1", type: "dashboard", title: "Sales" });
 * ```
 */
export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading] = useState(false);

  const addFavorite = useCallback(
    (item: Omit<FavoriteItem, "pinnedAt">): void => {
      setFavorites((prev) => {
        if (prev.some((f) => f.id === item.id)) return prev;
        const newItem: FavoriteItem = {
          ...item,
          pinnedAt: new Date().toISOString(),
        };
        return [...prev, newItem];
      });
    },
    [],
  );

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const isFavorite = useCallback(
    (id: string): boolean => {
      return favorites.some((f) => f.id === id);
    },
    [favorites],
  );

  const toggleFavorite = useCallback(
    (item: Omit<FavoriteItem, "pinnedAt">): void => {
      setFavorites((prev) => {
        const exists = prev.some((f) => f.id === item.id);
        if (exists) {
          return prev.filter((f) => f.id !== item.id);
        }
        const newItem: FavoriteItem = {
          ...item,
          pinnedAt: new Date().toISOString(),
        };
        return [...prev, newItem];
      });
    },
    [],
  );

  return { favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite, isLoading };
}
