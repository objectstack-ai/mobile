import { useRecentStore } from "~/stores/recent-store";

const base = { appId: "todo_app", object: "todo_task" };

describe("recent-store", () => {
  beforeEach(() => {
    useRecentStore.getState().clear();
  });

  it("tracks a viewed record at the front", () => {
    useRecentStore.getState().track({ ...base, recordId: "a", title: "Task A" });
    const { records } = useRecentStore.getState();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ recordId: "a", title: "Task A" });
    expect(typeof records[0].accessedAt).toBe("number");
  });

  it("most-recent-first ordering", () => {
    useRecentStore.getState().track({ ...base, recordId: "a", title: "A" });
    useRecentStore.getState().track({ ...base, recordId: "b", title: "B" });
    expect(useRecentStore.getState().records.map((r) => r.recordId)).toEqual([
      "b",
      "a",
    ]);
  });

  it("re-viewing a record dedupes and moves it to the front", () => {
    useRecentStore.getState().track({ ...base, recordId: "a", title: "A" });
    useRecentStore.getState().track({ ...base, recordId: "b", title: "B" });
    useRecentStore.getState().track({ ...base, recordId: "a", title: "A (again)" });
    const { records } = useRecentStore.getState();
    expect(records).toHaveLength(2);
    expect(records.map((r) => r.recordId)).toEqual(["a", "b"]);
    expect(records[0].title).toBe("A (again)");
  });

  it("treats the same record id under a different object as distinct", () => {
    useRecentStore.getState().track({ ...base, recordId: "a", title: "Task A" });
    useRecentStore
      .getState()
      .track({ appId: "todo_app", object: "todo_note", recordId: "a", title: "Note A" });
    expect(useRecentStore.getState().records).toHaveLength(2);
  });

  it("caps the history at 20 entries", () => {
    for (let i = 0; i < 25; i++) {
      useRecentStore.getState().track({ ...base, recordId: `r${i}`, title: `R${i}` });
    }
    const { records } = useRecentStore.getState();
    expect(records).toHaveLength(20);
    // The newest (r24) leads; the oldest five (r0–r4) fell off.
    expect(records[0].recordId).toBe("r24");
    expect(records.some((r) => r.recordId === "r0")).toBe(false);
  });

  it("clear empties the history", () => {
    useRecentStore.getState().track({ ...base, recordId: "a", title: "A" });
    useRecentStore.getState().clear();
    expect(useRecentStore.getState().records).toHaveLength(0);
  });
});
