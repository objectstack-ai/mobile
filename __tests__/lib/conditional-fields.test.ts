import {
  evaluateCondition,
  isFieldVisible,
  isFieldReadonlyByCondition,
  isFieldRequiredByCondition,
} from "~/lib/conditional-fields";

/** Build a cel/js condition expression from a source string. */
const cel = (source: string) => ({ dialect: "cel" as const, source });

describe("evaluateCondition", () => {
  describe("comparisons", () => {
    it("string equality", () => {
      expect(evaluateCondition(cel("status == 'active'"), { status: "active" }, false)).toBe(true);
      expect(evaluateCondition(cel("status == 'active'"), { status: "closed" }, false)).toBe(false);
    });

    it("inequality", () => {
      expect(evaluateCondition(cel("status != 'active'"), { status: "closed" }, false)).toBe(true);
      expect(evaluateCondition(cel("status != 'active'"), { status: "active" }, false)).toBe(false);
    });

    it("numeric comparisons", () => {
      expect(evaluateCondition(cel("priority >= 2"), { priority: 3 }, false)).toBe(true);
      expect(evaluateCondition(cel("priority >= 2"), { priority: 1 }, false)).toBe(false);
      expect(evaluateCondition(cel("amount < 1000"), { amount: 500 }, false)).toBe(true);
      expect(evaluateCondition(cel("amount > 1000"), { amount: 500 }, false)).toBe(false);
      expect(evaluateCondition(cel("count <= 0"), { count: 0 }, false)).toBe(true);
    });

    it("boolean equality", () => {
      expect(evaluateCondition(cel("done == true"), { done: true }, false)).toBe(true);
      expect(evaluateCondition(cel("done == false"), { done: true }, false)).toBe(false);
      expect(evaluateCondition(cel("archived == false"), { archived: false }, false)).toBe(true);
    });

    it("numeric string coercion on a comparison", () => {
      expect(evaluateCondition(cel("qty > 2"), { qty: "10" }, false)).toBe(true);
      expect(evaluateCondition(cel("qty == 10"), { qty: "10" }, false)).toBe(true);
    });
  });

  describe("logical operators", () => {
    it("&& and ||", () => {
      const ctx = { type: "invoice", amount: 5000 };
      expect(evaluateCondition(cel("type == 'invoice' && amount > 1000"), ctx, false)).toBe(true);
      expect(evaluateCondition(cel("type == 'po' && amount > 1000"), ctx, false)).toBe(false);
      expect(evaluateCondition(cel("type == 'po' || amount > 1000"), ctx, false)).toBe(true);
    });

    it("negation", () => {
      expect(evaluateCondition(cel("!archived"), { archived: false }, false)).toBe(true);
      expect(evaluateCondition(cel("!archived"), { archived: true }, false)).toBe(false);
      expect(evaluateCondition(cel("!(status == 'open')"), { status: "closed" }, false)).toBe(true);
    });

    it("precedence: && binds tighter than ||", () => {
      // a || (b && c) — true because a is true
      const ctx = { a: true, b: false, c: false };
      expect(evaluateCondition(cel("a || b && c"), ctx, false)).toBe(true);
    });

    it("parentheses override precedence", () => {
      const ctx = { a: true, b: false, c: false };
      expect(evaluateCondition(cel("(a || b) && c"), ctx, false)).toBe(false);
    });
  });

  describe("membership (in)", () => {
    it("value in list literal", () => {
      expect(evaluateCondition(cel("status in ['open', 'pending']"), { status: "open" }, false)).toBe(true);
      expect(evaluateCondition(cel("status in ['open', 'pending']"), { status: "closed" }, false)).toBe(false);
    });

    it("value in array field", () => {
      expect(evaluateCondition(cel("'admin' in roles"), { roles: ["user", "admin"] }, false)).toBe(true);
      expect(evaluateCondition(cel("'admin' in roles"), { roles: ["user"] }, false)).toBe(false);
    });
  });

  describe("dotted paths", () => {
    it("resolves nested values", () => {
      const ctx = { owner: { role: "manager" } };
      expect(evaluateCondition(cel("owner.role == 'manager'"), ctx, false)).toBe(true);
      expect(evaluateCondition(cel("owner.role == 'staff'"), ctx, false)).toBe(false);
    });

    it("missing nested path is undefined, not a crash", () => {
      expect(evaluateCondition(cel("owner.role == 'manager'"), {}, true)).toBe(false);
    });
  });

  describe("truthiness of a bare field", () => {
    it("treats a bare identifier as a boolean test", () => {
      expect(evaluateCondition(cel("vip"), { vip: true }, false)).toBe(true);
      expect(evaluateCondition(cel("vip"), { vip: false }, false)).toBe(false);
      expect(evaluateCondition(cel("vip"), { vip: "" }, false)).toBe(false);
      expect(evaluateCondition(cel("name"), { name: "Acme" }, false)).toBe(true);
    });
  });

  describe("fallback safety", () => {
    it("returns fallback for missing / empty / malformed expressions", () => {
      expect(evaluateCondition(undefined, {}, true)).toBe(true);
      expect(evaluateCondition(null, {}, false)).toBe(false);
      expect(evaluateCondition({}, {}, true)).toBe(true);
      expect(evaluateCondition(cel(""), {}, true)).toBe(true);
      expect(evaluateCondition(cel("   "), {}, true)).toBe(true);
      expect(evaluateCondition(cel("status =="), {}, true)).toBe(true); // parse error
      expect(evaluateCondition(cel("a b c )("), {}, false)).toBe(false); // garbage
    });

    it("returns fallback for non-boolean dialects", () => {
      expect(evaluateCondition({ dialect: "cron", source: "0 0 * * *" }, {}, true)).toBe(true);
      expect(evaluateCondition({ dialect: "template", source: "${x}" }, {}, false)).toBe(false);
    });

    it("accepts the js dialect and an undefined dialect", () => {
      expect(evaluateCondition({ dialect: "js", source: "x > 1" }, { x: 5 }, false)).toBe(true);
      expect(evaluateCondition({ source: "x > 1" }, { x: 5 }, false)).toBe(true);
    });

    it("never throws and never uses eval (no access to globals)", () => {
      // A field name that collides with a global must resolve from context, not JS scope.
      expect(evaluateCondition(cel("constructor == 'x'"), {}, true)).toBe(false);
      expect(() => evaluateCondition(cel("@#$%^"), {}, true)).not.toThrow();
    });
  });
});

describe("field condition helpers", () => {
  it("isFieldVisible defaults to visible and hides on false visibleWhen", () => {
    expect(isFieldVisible(undefined, {})).toBe(true);
    expect(isFieldVisible({}, {})).toBe(true);
    expect(isFieldVisible({ visibleWhen: cel("type == 'b'") }, { type: "a" })).toBe(false);
    expect(isFieldVisible({ visibleWhen: cel("type == 'b'") }, { type: "b" })).toBe(true);
  });

  it("isFieldReadonlyByCondition defaults to false", () => {
    expect(isFieldReadonlyByCondition(undefined, {})).toBe(false);
    expect(isFieldReadonlyByCondition({ readonlyWhen: cel("locked == true") }, { locked: true })).toBe(true);
    expect(isFieldReadonlyByCondition({ readonlyWhen: cel("locked == true") }, { locked: false })).toBe(false);
  });

  it("isFieldRequiredByCondition defaults to false", () => {
    expect(isFieldRequiredByCondition(undefined, {})).toBe(false);
    expect(isFieldRequiredByCondition({ requiredWhen: cel("type == 'invoice'") }, { type: "invoice" })).toBe(true);
    expect(isFieldRequiredByCondition({ requiredWhen: cel("type == 'invoice'") }, { type: "po" })).toBe(false);
  });
});
