import React from "react";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { OptionBadge } from "~/components/renderers/fields/FieldRenderer";
import type { FieldDefinition } from "~/components/renderers/types";

/**
 * Select/status option colours in object metadata are usually hex (`#10B981`),
 * which the named-colour Tailwind map can't resolve — they fell back to a flat
 * grey pill. `OptionBadge` renders the option's hex as an inline tint so list
 * rows and the detail view show the real status colour.
 */
describe("OptionBadge", () => {
  const statusField: FieldDefinition = {
    name: "status",
    type: "select",
    options: [
      { value: "completed", label: "Completed", color: "#10B981" },
      { value: "blocked", label: "Blocked", color: "red" },
    ],
  };

  /** Pull the text node's resolved style color for an option value. */
  function colorFor(value: string): unknown {
    const { UNSAFE_getByType } = render(<OptionBadge field={statusField} value={value} />);
    const text = UNSAFE_getByType(Text);
    const style = Array.isArray(text.props.style)
      ? Object.assign({}, ...text.props.style.filter(Boolean))
      : text.props.style;
    return style?.color;
  }

  it("renders the option label", () => {
    const { getByText } = render(<OptionBadge field={statusField} value="completed" />);
    expect(getByText("Completed")).toBeTruthy();
  });

  it("applies a hex option colour as the badge text colour", () => {
    expect(colorFor("completed")).toBe("#10B981");
  });

  it("does not inline-style a named colour (uses the Tailwind class path)", () => {
    // Named colours flow through className, not an inline `color` style.
    expect(colorFor("blocked")).toBeUndefined();
  });

  it("renders nothing for a non-select field or empty value", () => {
    const text = { name: "subject", type: "text" } as FieldDefinition;
    expect(render(<OptionBadge field={text} value="hi" />).toJSON()).toBeNull();
    expect(render(<OptionBadge field={statusField} value="" />).toJSON()).toBeNull();
  });
});
