import {
  relatedListColumnNames,
  discoverRelatedLists,
  relatedListQuery,
  type ScannableObjectMeta,
} from "~/lib/related-lists";

describe("relatedListColumnNames", () => {
  it("accepts bare string columns", () => {
    expect(relatedListColumnNames(["sku", "qty"])).toEqual(["sku", "qty"]);
  });

  it("accepts { field } / { name } column objects", () => {
    expect(relatedListColumnNames([{ field: "sku" }, { name: "qty" }])).toEqual(["sku", "qty"]);
  });

  it("drops empty / unknown shapes and non-arrays", () => {
    expect(relatedListColumnNames(["sku", "", { x: 1 }, null, 5])).toEqual(["sku"]);
    expect(relatedListColumnNames(undefined)).toEqual([]);
    expect(relatedListColumnNames("sku")).toEqual([]);
  });
});

describe("discoverRelatedLists", () => {
  const objects: ScannableObjectMeta[] = [
    {
      name: "order",
      label: "Order",
      fields: { name: { type: "text" } },
    },
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
        note: { type: "text" },
      },
    },
    {
      name: "payment",
      label: "Payment",
      fields: {
        // references order but NOT flagged as a related list → ignored
        order_id: { type: "lookup", reference: "order" },
      },
    },
    {
      name: "shipment",
      label: "Shipment",
      fields: {
        // related list but references a different object → ignored for "order"
        contact_id: { type: "lookup", reference: "contact", relatedList: true },
      },
    },
  ];

  it("finds child objects that reference the parent with relatedList:true", () => {
    const lists = discoverRelatedLists("order", objects);
    expect(lists).toHaveLength(1);
    expect(lists[0]).toEqual({
      childObject: "order_line",
      childLabel: "Order Line",
      relationshipField: "order_id",
      title: "Line Items",
      columns: ["sku", "qty"],
    });
  });

  it("ignores reference fields without relatedList, and lists for other parents", () => {
    expect(discoverRelatedLists("contact", objects)).toEqual([
      {
        childObject: "shipment",
        childLabel: "Shipment",
        relationshipField: "contact_id",
        title: "Shipment", // no relatedListTitle → falls back to child label
        columns: [],
      },
    ]);
    expect(discoverRelatedLists("nonexistent", objects)).toEqual([]);
  });

  it("returns results in deterministic (object, field) order", () => {
    const multi: ScannableObjectMeta[] = [
      { name: "b_obj", fields: { p: { type: "lookup", reference: "p", relatedList: true } } },
      { name: "a_obj", fields: { p: { type: "lookup", reference: "p", relatedList: true } } },
    ];
    expect(discoverRelatedLists("p", multi).map((d) => d.childObject)).toEqual(["a_obj", "b_obj"]);
  });

  it("is safe on malformed input", () => {
    expect(discoverRelatedLists("", objects)).toEqual([]);
    // @ts-expect-error testing runtime resilience to a non-array
    expect(discoverRelatedLists("order", null)).toEqual([]);
    expect(discoverRelatedLists("order", [{ name: "x" }])).toEqual([]);
  });
});

describe("relatedListQuery", () => {
  const descriptor = {
    childObject: "order_line",
    childLabel: "Order Line",
    relationshipField: "order_id",
    title: "Line Items",
    columns: ["sku", "qty"],
  };

  it("filters the child by relationshipField = parentId and selects columns", () => {
    expect(relatedListQuery(descriptor, "ORD-1", 10)).toEqual({
      object: "order_line",
      options: {
        filters: ["order_id", "=", "ORD-1"],
        select: ["sku", "qty"],
        top: 10,
      },
    });
  });

  it("omits select when there are no columns and defaults the limit", () => {
    expect(relatedListQuery({ ...descriptor, columns: [] }, "ORD-1")).toEqual({
      object: "order_line",
      options: {
        filters: ["order_id", "=", "ORD-1"],
        top: 20,
      },
    });
  });
});
