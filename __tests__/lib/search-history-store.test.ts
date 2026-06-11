import { useSearchHistoryStore } from "~/stores/search-history-store";

describe("search-history-store", () => {
  beforeEach(() => {
    useSearchHistoryStore.getState().clear();
  });

  it("records a trimmed query at the front", () => {
    useSearchHistoryStore.getState().record("  invoices  ");
    expect(useSearchHistoryStore.getState().queries).toEqual(["invoices"]);
  });

  it("ignores blank queries", () => {
    useSearchHistoryStore.getState().record("   ");
    expect(useSearchHistoryStore.getState().queries).toEqual([]);
  });

  it("dedupes case-insensitively, moving the match to the front", () => {
    useSearchHistoryStore.getState().record("Tasks");
    useSearchHistoryStore.getState().record("invoices");
    useSearchHistoryStore.getState().record("tasks");
    expect(useSearchHistoryStore.getState().queries).toEqual(["tasks", "invoices"]);
  });

  it("caps history at 8 entries", () => {
    for (let i = 0; i < 12; i++) {
      useSearchHistoryStore.getState().record(`q${i}`);
    }
    const { queries } = useSearchHistoryStore.getState();
    expect(queries).toHaveLength(8);
    expect(queries[0]).toBe("q11");
    expect(queries).not.toContain("q0");
  });

  it("removes a single query and clears all", () => {
    useSearchHistoryStore.getState().record("a");
    useSearchHistoryStore.getState().record("b");
    useSearchHistoryStore.getState().remove("a");
    expect(useSearchHistoryStore.getState().queries).toEqual(["b"]);
    useSearchHistoryStore.getState().clear();
    expect(useSearchHistoryStore.getState().queries).toEqual([]);
  });
});
