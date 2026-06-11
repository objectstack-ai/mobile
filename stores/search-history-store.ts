import { create } from "zustand";
import { createMMKV } from "react-native-mmkv";

/**
 * Recent global-search queries, persisted so the search screen can offer them
 * for one-tap re-run. Case-insensitively deduped, newest-first, capped small.
 */
const storage = createMMKV({ id: "objectstack-search-history" });
const KEY = "queries";
const MAX_QUERIES = 8;

function load(): string[] {
  try {
    const raw = storage.getString(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

interface SearchHistoryState {
  queries: string[];
  /** Remember a query (trimmed; no-op when empty). */
  record: (query: string) => void;
  /** Forget a single query. */
  remove: (query: string) => void;
  /** Forget everything. */
  clear: () => void;
}

export const useSearchHistoryStore = create<SearchHistoryState>((set) => ({
  queries: load(),
  record: (query) =>
    set((state) => {
      const trimmed = query.trim();
      if (!trimmed) return state;
      const deduped = state.queries.filter(
        (q) => q.toLowerCase() !== trimmed.toLowerCase(),
      );
      const next = [trimmed, ...deduped].slice(0, MAX_QUERIES);
      storage.set(KEY, JSON.stringify(next));
      return { queries: next };
    }),
  remove: (query) =>
    set((state) => {
      const next = state.queries.filter((q) => q !== query);
      storage.set(KEY, JSON.stringify(next));
      return { queries: next };
    }),
  clear: () => {
    storage.set(KEY, JSON.stringify([]));
    set({ queries: [] });
  },
}));
