import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface SearchResult {
  id: string;
  object: string;
  recordId: string;
  title: string;
  subtitle?: string;
  score: number;
  highlight?: string;
}

export interface UseGlobalSearchResult {
  /** Current search results */
  results: SearchResult[];
  /** Execute a search query */
  search: (
    query: string,
    options?: { limit?: number; object?: string },
  ) => Promise<SearchResult[]>;
  /** Recently executed search queries */
  recentSearches: string[];
  /** Clear recent search history */
  clearRecent: () => void;
  /** Whether a search operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for global search across all objects and records
 * via `client.api.search()`.
 *
 * ```ts
 * const { results, search, recentSearches } = useGlobalSearch();
 * await search("quarterly report", { limit: 20 });
 * ```
 */
export function useGlobalSearch(): UseGlobalSearchResult {
  const client = useClient();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(
    async (
      query: string,
      options?: { limit?: number; object?: string },
    ): Promise<SearchResult[]> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).api?.search(query, options);
        const items: SearchResult[] = result ?? [];
        setResults(items);
        setRecentSearches((prev) => {
          const filtered = prev.filter((s) => s !== query);
          return [query, ...filtered].slice(0, 10);
        });
        return items;
      } catch (err: unknown) {
        const searchError =
          err instanceof Error ? err : new Error("Failed to execute search");
        setError(searchError);
        throw searchError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const clearRecent = useCallback(() => {
    setRecentSearches([]);
  }, []);

  return { results, search, recentSearches, clearRecent, isLoading, error };
}
