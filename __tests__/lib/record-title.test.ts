import {
  renderRecordTitle,
  fillTitleTemplate,
  titleTemplateFields,
  getTitleSource,
  getCompactLayout,
} from "~/lib/record-title";

/* ------------------------------------------------------------------ */
/*  fillTitleTemplate — must handle every titleFormat dialect          */
/* ------------------------------------------------------------------ */

describe("fillTitleTemplate", () => {
  it("fills a single-brace `{field}` template", () => {
    expect(
      fillTitleTemplate("{account_number} - {name}", {
        account_number: "ACC-1",
        name: "Acme",
      }),
    ).toBe("ACC-1 - Acme");
  });

  // Regression: objects like expense_line use `{{record.field}}`. The old
  // single-brace regex only consumed the inner `{record.field}`, leaving the
  // outer braces behind and rendering titles as a literal "{}".
  it("fills a mustache `{{record.field}}` template (no more literal {})", () => {
    expect(
      fillTitleTemplate("{{record.description}}", {
        description: "Dinner with Acme prospect",
      }),
    ).toBe("Dinner with Acme prospect");
  });

  it("fills a mustache `{{field}}` template without a record. prefix", () => {
    expect(fillTitleTemplate("{{title}}", { title: "Q2 Report" })).toBe(
      "Q2 Report",
    );
  });

  it("trims separators left dangling by an empty token", () => {
    expect(
      fillTitleTemplate("{account_number} - {name}", { name: "Acme" }),
    ).toBe("Acme");
  });

  it("returns empty string when nothing resolves", () => {
    expect(fillTitleTemplate("{{record.description}}", {})).toBe("");
  });
});

describe("titleTemplateFields", () => {
  it("extracts the bare field name from a record. accessor", () => {
    expect(titleTemplateFields("{{record.description}}")).toEqual([
      "description",
    ]);
  });

  it("extracts multiple single-brace fields", () => {
    expect(titleTemplateFields("{account_number} - {name}")).toEqual([
      "account_number",
      "name",
    ]);
  });
});

/* ------------------------------------------------------------------ */
/*  renderRecordTitle — end-to-end with object meta                    */
/* ------------------------------------------------------------------ */

describe("renderRecordTitle", () => {
  it("renders via a mustache titleFormat (expense_line shape)", () => {
    const meta = {
      label: "费用明细",
      titleFormat: { dialect: "template", source: "{{record.description}}" },
      compactLayout: ["description", "amount"],
    };
    expect(
      renderRecordTitle(meta, { description: "Dinner with Acme prospect" }),
    ).toBe("Dinner with Acme prospect");
  });

  it("falls back to compactLayout lead field when the template resolves empty", () => {
    const meta = {
      titleFormat: { dialect: "template", source: "{{record.description}}" },
      compactLayout: ["merchant", "amount"],
    };
    expect(renderRecordTitle(meta, { merchant: "Starbucks" })).toBe(
      "Starbucks",
    );
  });

  it("accepts a JSON-string titleFormat", () => {
    const meta = {
      titleFormat: JSON.stringify({ source: "{{record.name}}" }),
    };
    expect(getTitleSource(meta)).toBe("{{record.name}}");
    expect(renderRecordTitle(meta, { name: "差旅" })).toBe("差旅");
  });

  it("parses a JSON-string compactLayout", () => {
    expect(getCompactLayout({ compactLayout: '["a","b"]' })).toEqual(["a", "b"]);
  });

  it("uses the fallback string when there is no record", () => {
    expect(renderRecordTitle({}, null, "—")).toBe("—");
  });
});
