import { renderHook, waitFor } from "@testing-library/react-native";
import { useRelatedLists } from "~/hooks/useRelatedLists";

/** A minimal mock client: getItems returns objects, data.find returns children. */
function makeClient(opts: {
  objects?: unknown;
  findImpl?: (object: string, options: unknown) => Promise<unknown>;
}) {
  const getItems = jest.fn().mockResolvedValue(opts.objects ?? { items: [] });
  const find = jest.fn(
    opts.findImpl ?? (async () => ({ records: [] })),
  );
  return {
    client: { meta: { getItems }, data: { find } } as never,
    getItems,
    find,
  };
}

const ORDER_SCHEMA = {
  items: [
    { name: "order", label: "Order", fields: { name: { type: "text" } } },
    {
      name: "order_line",
      label: "Order Line",
      fields: {
        order_id: {
          type: "master_detail",
          reference: "order",
          relatedList: true,
          relatedListTitle: "Line Items",
          relatedListColumns: ["sku", "qty"],
        },
      },
    },
  ],
};

describe("useRelatedLists", () => {
  it("returns empty without scanning when parent/record is missing", async () => {
    const { client, getItems } = makeClient({});
    const { result } = renderHook(() => useRelatedLists(client, undefined, undefined));
    expect(result.current.relatedLists).toEqual([]);
    expect(getItems).not.toHaveBeenCalled();
  });

  it("discovers a related list and loads its child records", async () => {
    const { client, find } = makeClient({
      objects: ORDER_SCHEMA,
      findImpl: async () => ({
        records: [
          { id: "L1", sku: "A", qty: 2 },
          { id: "L2", sku: "B", qty: 5 },
        ],
      }),
    });

    const { result } = renderHook(() => useRelatedLists(client, "order", "ORD-1"));

    await waitFor(() => expect(result.current.relatedLists.length).toBe(1));

    const list = result.current.relatedLists[0];
    expect(list.label).toBe("Line Items");
    expect(list.objectName).toBe("order_line");
    expect(list.columns).toEqual(["sku", "qty"]);
    expect(list.records).toHaveLength(2);

    // queried the child filtered by the relationship field = parent id
    expect(find).toHaveBeenCalledWith("order_line", {
      filters: ["order_id", "=", "ORD-1"],
      select: ["sku", "qty"],
      top: 20,
    });
  });

  it("returns [] when no object references the parent", async () => {
    const { client } = makeClient({ objects: ORDER_SCHEMA });
    const { result } = renderHook(() => useRelatedLists(client, "no_children_here", "X1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.relatedLists).toEqual([]);
  });

  it("is best-effort: a getItems failure surfaces an error and empty lists", async () => {
    const getItems = jest.fn().mockRejectedValue(new Error("boom"));
    const client = { meta: { getItems }, data: { find: jest.fn() } } as never;
    const { result } = renderHook(() => useRelatedLists(client, "order", "ORD-1"));
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.relatedLists).toEqual([]);
  });

  it("keeps the page alive when a single child query fails (empty records)", async () => {
    const { client } = makeClient({
      objects: ORDER_SCHEMA,
      findImpl: async () => {
        throw new Error("child query failed");
      },
    });
    const { result } = renderHook(() => useRelatedLists(client, "order", "ORD-1"));
    await waitFor(() => expect(result.current.relatedLists.length).toBe(1));
    expect(result.current.relatedLists[0].records).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
