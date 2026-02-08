import {
  operatorsForFieldType,
  isCompoundFilter,
  isSimpleFilter,
  createSimpleFilter,
  createCompoundFilter,
  serializeFilter,
  serializeFilterTree,
  buildProjection,
  OPERATOR_META,
} from "~/lib/query-builder";

/* ------------------------------------------------------------------ */
/*  operatorsForFieldType                                               */
/* ------------------------------------------------------------------ */

describe("operatorsForFieldType", () => {
  it("returns text operators for text fields", () => {
    const ops = operatorsForFieldType("text");
    expect(ops).toContain("contains");
    expect(ops).toContain("starts_with");
    expect(ops).not.toContain("gt");
  });

  it("returns numeric operators for number fields", () => {
    const ops = operatorsForFieldType("number");
    expect(ops).toContain("gt");
    expect(ops).toContain("between");
    expect(ops).not.toContain("contains");
  });

  it("returns limited operators for boolean fields", () => {
    const ops = operatorsForFieldType("boolean");
    expect(ops).toEqual(["eq", "neq", "is_null", "is_not_null"]);
  });

  it("returns common operators for unknown types", () => {
    const ops = operatorsForFieldType("unknown_type");
    expect(ops).toEqual(["eq", "neq", "is_null", "is_not_null"]);
  });
});

/* ------------------------------------------------------------------ */
/*  Type guards                                                         */
/* ------------------------------------------------------------------ */

describe("isCompoundFilter / isSimpleFilter", () => {
  it("identifies a compound filter", () => {
    const f = createCompoundFilter("AND", []);
    expect(isCompoundFilter(f)).toBe(true);
    expect(isSimpleFilter(f)).toBe(false);
  });

  it("identifies a simple filter", () => {
    const f = createSimpleFilter("name", "eq");
    expect(isSimpleFilter(f)).toBe(true);
    expect(isCompoundFilter(f)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  Factory helpers                                                     */
/* ------------------------------------------------------------------ */

describe("createSimpleFilter", () => {
  it("creates a filter with defaults", () => {
    const f = createSimpleFilter();
    expect(f.field).toBe("");
    expect(f.operator).toBe("eq");
    expect(f.value).toBe("");
    expect(f.id).toBeDefined();
  });

  it("creates a filter with specified field/operator", () => {
    const f = createSimpleFilter("status", "in");
    expect(f.field).toBe("status");
    expect(f.operator).toBe("in");
  });
});

describe("createCompoundFilter", () => {
  it("creates an AND group by default", () => {
    const f = createCompoundFilter();
    expect(f.logic).toBe("AND");
    expect(f.filters).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  Serialization                                                       */
/* ------------------------------------------------------------------ */

describe("serializeFilter", () => {
  it("serializes a simple eq filter", () => {
    const f = createSimpleFilter("name", "eq");
    f.value = "Alice";
    expect(serializeFilter(f)).toEqual(["name", "eq", "Alice"]);
  });

  it("returns null for a filter without field", () => {
    const f = createSimpleFilter("", "eq");
    expect(serializeFilter(f)).toBeNull();
  });

  it("serializes is_null (no value)", () => {
    const f = createSimpleFilter("email", "is_null");
    expect(serializeFilter(f)).toEqual(["email", "is_null"]);
  });

  it("serializes between (two values)", () => {
    const f = createSimpleFilter("age", "between");
    f.value = 18;
    f.value2 = 65;
    expect(serializeFilter(f)).toEqual(["age", "between", 18, 65]);
  });

  it("serializes a compound AND filter", () => {
    const a = createSimpleFilter("name", "eq");
    a.value = "Alice";
    const b = createSimpleFilter("age", "gt");
    b.value = 30;
    const compound = createCompoundFilter("AND", [a, b]);
    expect(serializeFilter(compound)).toEqual([
      "AND",
      ["name", "eq", "Alice"],
      ["age", "gt", 30],
    ]);
  });

  it("unwraps a compound with only one child", () => {
    const a = createSimpleFilter("x", "eq");
    a.value = 1;
    const compound = createCompoundFilter("AND", [a]);
    expect(serializeFilter(compound)).toEqual(["x", "eq", 1]);
  });

  it("returns null for an empty compound", () => {
    const compound = createCompoundFilter("OR", []);
    expect(serializeFilter(compound)).toBeNull();
  });
});

describe("serializeFilterTree", () => {
  it("returns null for empty tree", () => {
    const root = createCompoundFilter("AND", []);
    expect(serializeFilterTree(root)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  buildProjection                                                     */
/* ------------------------------------------------------------------ */

describe("buildProjection", () => {
  it("returns the fields array when non-empty", () => {
    expect(buildProjection(["name", "email"])).toEqual(["name", "email"]);
  });

  it("returns undefined when empty", () => {
    expect(buildProjection([])).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  OPERATOR_META completeness                                          */
/* ------------------------------------------------------------------ */

describe("OPERATOR_META", () => {
  it("has metadata for every operator", () => {
    const ops = Object.keys(OPERATOR_META);
    expect(ops.length).toBeGreaterThanOrEqual(14);
    ops.forEach((op) => {
      expect(OPERATOR_META[op as keyof typeof OPERATOR_META]).toHaveProperty("label");
      expect(OPERATOR_META[op as keyof typeof OPERATOR_META]).toHaveProperty("valueCount");
    });
  });
});
