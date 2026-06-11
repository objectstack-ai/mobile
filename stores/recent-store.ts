import { create } from "zustand";
import { createMMKV } from "react-native-mmkv";

/**
 * A record the user has opened, remembered for the Home "Recent" section.
 * Identified by its route triple (app / object / record) so the same record
 * opened twice moves to the front instead of duplicating.
 */
export interface RecentRecord {
  /** App route segment the record opens under. */
  appId: string;
  /** Object (table) name. */
  object: string;
  /** Record id. */
  recordId: string;
  /** Display title (the record's resolved name). */
  title: string;
  /** Optional secondary line (e.g. the object label). */
  subtitle?: string;
  /** Epoch ms of the most recent access — drives ordering. */
  accessedAt: number;
}

const storage = createMMKV({ id: "objectstack-recents" });
const KEY = "records";
/** Cap the history; the Home section only surfaces the first handful. */
const MAX_RECENTS = 20;

function keyOf(r: { appId: string; object: string; recordId: string }): string {
  return `${r.appId}/${r.object}/${r.recordId}`;
}

function load(): RecentRecord[] {
  try {
    const raw = storage.getString(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentRecord[]) : [];
  } catch {
    return [];
  }
}

interface RecentState {
  records: RecentRecord[];
  /** Record (or re-order to front) a viewed record. */
  track: (record: Omit<RecentRecord, "accessedAt">) => void;
  /** Forget everything. */
  clear: () => void;
}

export const useRecentStore = create<RecentState>((set) => ({
  records: load(),
  track: (record) =>
    set((state) => {
      const k = keyOf(record);
      const deduped = state.records.filter((r) => keyOf(r) !== k);
      const next = [
        { ...record, accessedAt: Date.now() },
        ...deduped,
      ].slice(0, MAX_RECENTS);
      storage.set(KEY, JSON.stringify(next));
      return { records: next };
    }),
  clear: () => {
    storage.set(KEY, JSON.stringify([]));
    set({ records: [] });
  },
}));
