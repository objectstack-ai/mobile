import {
  computeColumnSummary,
  buildListItems,
} from "~/components/renderers/ListViewRenderer";
import type { ListColumn, ListViewMeta } from "~/components/renderers/types";

describe("computeColumnSummary", () => {
  const records = [
    { amount: 10, status: "open", note: "a" },
    { amount: 20, status: "open", note: "" },
    { amount: 30, status: "closed", note: null },
    { amount: undefined, status: "closed", note: "b" },
  ];

  const col = (overrides: Partial<ListColumn> & { field: string }): ListColumn =>
    overrides;

  it("returns null for absent or `none` operator", () => {
    expect(computeColumnSummary(records, col({ field: "amount" }))).toBeNull();
    expect(
      computeColumnSummary(records, col({ field: "amount", summary: "none" })),
    ).toBeNull();
  });

  it("counts rows, filled and empty", () => {
    expect(
      computeColumnSummary(records, col({ field: "amount", summary: "count" })),
    ).toBe("4");
    expect(
      computeColumnSummary(
        records,
        col({ field: "amount", summary: "count_filled" }),
      ),
    ).toBe("3");
    expect(
      computeColumnSummary(
        records,
        col({ field: "amount", summary: "count_empty" }),
      ),
    ).toBe("1");
  });

  it("counts unique non-empty values", () => {
    expect(
      computeColumnSummary(
        records,
        col({ field: "status", summary: "count_unique" }),
      ),
    ).toBe("2");
  });

  it("computes numeric sum / avg / min / max over filled values", () => {
    expect(
      computeColumnSummary(records, col({ field: "amount", summary: "sum" })),
    ).toBe("60");
    expect(
      computeColumnSummary(records, col({ field: "amount", summary: "avg" })),
    ).toBe("20");
    expect(
      computeColumnSummary(records, col({ field: "amount", summary: "min" })),
    ).toBe("10");
    expect(
      computeColumnSummary(records, col({ field: "amount", summary: "max" })),
    ).toBe("30");
  });

  it("computes percentage empty / filled", () => {
    // note: "a", "", null, "b" → 2 filled, 2 empty of 4
    expect(
      computeColumnSummary(
        records,
        col({ field: "note", summary: "percent_filled" }),
      ),
    ).toBe("50%");
    expect(
      computeColumnSummary(
        records,
        col({ field: "note", summary: "percent_empty" }),
      ),
    ).toBe("50%");
  });
});

describe("buildListItems", () => {
  const data = [
    { id: 1, status: "open" },
    { id: 2, status: "closed" },
    { id: 3, status: "open" },
  ];

  it("returns flat rows when no grouping is configured", () => {
    const items = buildListItems(data, {} as ListViewMeta);
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.__kind === "row")).toBe(true);
  });

  it("inserts group headers with counts when grouping is set", () => {
    const meta: ListViewMeta = {
      grouping: { fields: [{ field: "status", order: "asc", collapsed: false }] },
    };
    const items = buildListItems(data, meta);

    // 2 group headers + 3 rows
    expect(items).toHaveLength(5);

    const headers = items.filter((i) => i.__kind === "group");
    expect(headers).toEqual([
      { __kind: "group", label: "open", count: 2 },
      { __kind: "group", label: "closed", count: 1 },
    ]);
  });

  it("buckets empty/undefined grouping values under a placeholder", () => {
    const meta: ListViewMeta = {
      grouping: { fields: [{ field: "missing", order: "asc", collapsed: false }] },
    };
    const items = buildListItems(data, meta);
    const headers = items.filter((i) => i.__kind === "group");
    expect(headers).toEqual([{ __kind: "group", label: "—", count: 3 }]);
  });
});
