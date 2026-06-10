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
  resolveFilterMacro,
  mongoFilterToAst,
  type FilterOperator,
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
  // The data API parses comparison *symbols* (`=`, `>`, …), not the builder's
  // internal word tokens (`eq`, `gt`). serializeFilter must translate, or the
  // server silently ignores the filter and returns every row.
  it("serializes a simple eq filter to the `=` symbol", () => {
    const f = createSimpleFilter("name", "eq");
    f.value = "Alice";
    expect(serializeFilter(f)).toEqual(["name", "=", "Alice"]);
  });

  it("translates comparison operators to symbols", () => {
    const cases: [FilterOperator, string][] = [
      ["neq", "!="],
      ["gt", ">"],
      ["gte", ">="],
      ["lt", "<"],
      ["lte", "<="],
    ];
    for (const [op, sym] of cases) {
      const f = createSimpleFilter("age", op);
      f.value = 30;
      expect(serializeFilter(f)).toEqual(["age", sym, 30]);
    }
  });

  it("keeps word operators the API accepts verbatim", () => {
    const f = createSimpleFilter("name", "contains");
    f.value = "ac";
    expect(serializeFilter(f)).toEqual(["name", "contains", "ac"]);
  });

  it("returns null for a filter without field", () => {
    const f = createSimpleFilter("", "eq");
    expect(serializeFilter(f)).toBeNull();
  });

  it("rewrites is_null / is_not_null to (in)equality with null", () => {
    const a = createSimpleFilter("email", "is_null");
    expect(serializeFilter(a)).toEqual(["email", "=", null]);
    const b = createSimpleFilter("email", "is_not_null");
    expect(serializeFilter(b)).toEqual(["email", "!=", null]);
  });

  it("expands between into an inclusive AND range", () => {
    const f = createSimpleFilter("age", "between");
    f.value = 18;
    f.value2 = 65;
    expect(serializeFilter(f)).toEqual([
      "and",
      ["age", ">=", 18],
      ["age", "<=", 65],
    ]);
  });

  it("serializes a compound AND filter with lowercase logic", () => {
    const a = createSimpleFilter("name", "eq");
    a.value = "Alice";
    const b = createSimpleFilter("age", "gt");
    b.value = 30;
    const compound = createCompoundFilter("AND", [a, b]);
    expect(serializeFilter(compound)).toEqual([
      "and",
      ["name", "=", "Alice"],
      ["age", ">", 30],
    ]);
  });

  it("unwraps a compound with only one child", () => {
    const a = createSimpleFilter("x", "eq");
    a.value = 1;
    const compound = createCompoundFilter("AND", [a]);
    expect(serializeFilter(compound)).toEqual(["x", "=", 1]);
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

describe("resolveFilterMacro — week tokens", () => {
  const DAY = 86_400_000;

  it("resolves {current_week_start} to the most recent Monday, start of day", () => {
    const v = resolveFilterMacro("{current_week_start}");
    expect(typeof v).toBe("number");
    const d = new Date(v as number);
    expect(d.getDay()).toBe(1); // Monday
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0]);
    expect(v as number).toBeLessThanOrEqual(Date.now());
  });

  it("resolves {N_weeks_ago} and {last_N_weeks} to N*7 days before now", () => {
    const before = Date.now();
    const ago = resolveFilterMacro("{4_weeks_ago}") as number;
    const after = Date.now();
    // Within the window [before - 28d, after - 28d].
    expect(ago).toBeGreaterThanOrEqual(before - 28 * DAY - 5);
    expect(ago).toBeLessThanOrEqual(after - 28 * DAY + 5);
    expect(typeof resolveFilterMacro("{last_2_weeks}")).toBe("number");
  });

  it("leaves an unknown macro untouched (visibly inert, not silently zero)", () => {
    expect(resolveFilterMacro("{not_a_real_macro}")).toBe("{not_a_real_macro}");
  });

  it("passes through non-string and non-macro values unchanged", () => {
    expect(resolveFilterMacro(42)).toBe(42);
    expect(resolveFilterMacro("literal")).toBe("literal");
  });

  it("resolves day/relative tokens", () => {
    const day = 86_400_000;
    const today = resolveFilterMacro("{today}") as number;
    expect(typeof today).toBe("number");
    expect(resolveFilterMacro("{yesterday}")).toBe(today - day);
    expect(resolveFilterMacro("{tomorrow}")).toBe(today + day);
    expect(typeof resolveFilterMacro("{now}")).toBe("number");
    const ago = resolveFilterMacro("{3_days_ago}") as number;
    expect(ago).toBeLessThan(Date.now());
    expect(typeof resolveFilterMacro("{last_2_months}")).toBe("number");
    expect(typeof resolveFilterMacro("{1_year_ago}")).toBe("number");
  });

  it("resolves period-boundary tokens", () => {
    for (const tok of [
      "{current_year_start}",
      "{current_year_end}",
      "{current_month_start}",
      "{current_month_end}",
      "{current_quarter_start}",
      "{current_quarter_end}",
    ]) {
      expect(typeof resolveFilterMacro(tok)).toBe("number");
    }
  });
});

describe("mongoFilterToAst", () => {
  it("returns undefined for an empty or absent filter", () => {
    expect(mongoFilterToAst(undefined)).toBeUndefined();
    expect(mongoFilterToAst(null)).toBeUndefined();
    expect(mongoFilterToAst({})).toBeUndefined();
  });

  it("translates a bare value to an equality node", () => {
    expect(mongoFilterToAst({ status: "open" })).toEqual(["status", "=", "open"]);
  });

  it("translates Mongo operators to the AST symbol vocabulary", () => {
    expect(mongoFilterToAst({ age: { $gte: 18 } })).toEqual(["age", ">=", 18]);
    expect(mongoFilterToAst({ tag: { $in: ["a", "b"] } })).toEqual([
      "tag",
      "in",
      ["a", "b"],
    ]);
  });

  it("ANDs multiple operators on one field", () => {
    expect(mongoFilterToAst({ age: { $gte: 18, $lte: 65 } })).toEqual([
      "and",
      ["age", ">=", 18],
      ["age", "<=", 65],
    ]);
  });

  it("ANDs multiple fields into a compound node", () => {
    expect(
      mongoFilterToAst({ is_completed: true, priority: "high" }),
    ).toEqual([
      "and",
      ["is_completed", "=", true],
      ["priority", "=", "high"],
    ]);
  });

  it("resolves date macros inside conditions", () => {
    const ast = mongoFilterToAst({ created_at: { $gte: "{today}" } }) as unknown[];
    expect(ast[0]).toBe("created_at");
    expect(ast[1]).toBe(">=");
    expect(typeof ast[2]).toBe("number");
  });

  it("skips unknown operators", () => {
    expect(mongoFilterToAst({ x: { $weird: 1 } })).toBeUndefined();
  });
});
