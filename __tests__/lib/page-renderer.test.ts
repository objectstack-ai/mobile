/**
 * Tests for page-renderer – validates PageSchema validation
 * and resolution logic.
 */
import {
  validatePageSchema,
  resolvePageSchema,
  type PageSchema,
} from "~/lib/page-renderer";

describe("validatePageSchema", () => {
  it("returns null for null input", () => {
    expect(validatePageSchema(null)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(validatePageSchema("string")).toBeNull();
    expect(validatePageSchema(42)).toBeNull();
  });

  it("returns null when name is missing", () => {
    expect(validatePageSchema({ regions: [] })).toBeNull();
  });

  it("returns null when regions is not an array", () => {
    expect(validatePageSchema({ name: "test", regions: "bad" })).toBeNull();
  });

  it("validates a correct PageSchema", () => {
    const schema = {
      name: "test-page",
      label: "Test Page",
      regions: [
        {
          name: "main",
          components: [{ type: "page:header", props: { title: "Hello" } }],
        },
      ],
    };
    const result = validatePageSchema(schema);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("test-page");
  });
});

describe("resolvePageSchema", () => {
  const baseSchema: PageSchema = {
    name: "detail-page",
    label: "Detail Page",
    object: "tasks",
    layout: "single",
    regions: [
      {
        name: "header",
        components: [
          {
            type: "page:header",
            props: { title: "{{pageTitle}}", subtitle: "Task Detail" },
          },
        ],
      },
      {
        name: "main",
        components: [
          { type: "record:details", props: { object: "tasks" } },
          {
            type: "record:related_list",
            props: { relatedObject: "comments" },
          },
        ],
      },
    ],
    variables: [
      { name: "pageTitle", type: "string", default: "Default Title" },
    ],
  };

  it("resolves with default variable values", () => {
    const resolved = resolvePageSchema(baseSchema);

    expect(resolved.name).toBe("detail-page");
    expect(resolved.label).toBe("Detail Page");
    expect(resolved.object).toBe("tasks");
    expect(resolved.layout).toBe("single");
    expect(resolved.regions).toHaveLength(2);

    // Variable should resolve to default
    expect(resolved.regions[0].components[0].props.title).toBe("Default Title");
    expect(resolved.regions[0].components[0].props.subtitle).toBe("Task Detail");
  });

  it("resolves with overridden variables", () => {
    const resolved = resolvePageSchema(baseSchema, {
      pageTitle: "Custom Title",
    });

    expect(resolved.regions[0].components[0].props.title).toBe("Custom Title");
  });

  it("preserves non-variable props", () => {
    const resolved = resolvePageSchema(baseSchema);

    expect(resolved.regions[1].components[0].props.object).toBe("tasks");
    expect(resolved.regions[1].components[1].props.relatedObject).toBe(
      "comments",
    );
  });

  it("defaults layout to single", () => {
    const schema: PageSchema = {
      name: "simple",
      regions: [],
    };
    const resolved = resolvePageSchema(schema);
    expect(resolved.layout).toBe("single");
  });

  it("defaults label to name", () => {
    const schema: PageSchema = {
      name: "my-page",
      regions: [],
    };
    const resolved = resolvePageSchema(schema);
    expect(resolved.label).toBe("my-page");
  });

  it("handles two-column layout", () => {
    const schema: PageSchema = {
      name: "two-col",
      layout: "two-column",
      regions: [
        { name: "left", components: [{ type: "page:card", props: {} }] },
        { name: "right", components: [{ type: "page:card", props: {} }] },
      ],
    };
    const resolved = resolvePageSchema(schema);
    expect(resolved.layout).toBe("two-column");
    expect(resolved.regions).toHaveLength(2);
  });

  it("keeps unresolvable variable bindings as-is", () => {
    const schema: PageSchema = {
      name: "test",
      regions: [
        {
          name: "main",
          components: [
            { type: "page:header", props: { title: "{{unknownVar}}" } },
          ],
        },
      ],
    };
    const resolved = resolvePageSchema(schema);
    // unknownVar has no default and no override, so it stays as the template string
    expect(resolved.regions[0].components[0].props.title).toBe("{{unknownVar}}");
  });
});
