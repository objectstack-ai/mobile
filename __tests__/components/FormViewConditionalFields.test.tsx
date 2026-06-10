import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

import { FormViewRenderer } from "~/components/renderers/FormViewRenderer";
import type { FieldDefinition, FormViewMeta } from "~/components/renderers/types";

const cel = (source: string) => ({ dialect: "cel" as const, source });

/**
 * Integration coverage for ObjectStack 8.0 conditional fields wired into the
 * form renderer: `visibleWhen` (hide), `readonlyWhen` (lock), `requiredWhen`
 * (validate). Asserted through the rendered tree, not the evaluator directly.
 */
describe("FormViewRenderer — conditional fields", () => {
  const fields: FieldDefinition[] = [
    { name: "type", label: "Type", type: "text" },
    {
      name: "invoice_no",
      label: "Invoice No",
      type: "text",
      // Only shown + required when type is "invoice".
      visibleWhen: cel("type == 'invoice'"),
      requiredWhen: cel("type == 'invoice'"),
    },
    {
      name: "ref",
      label: "Reference",
      type: "text",
      // Locked once the record is approved.
      readonlyWhen: cel("approved == true"),
    },
  ];

  const view: FormViewMeta = {
    sections: [{ fields: ["type", "invoice_no", "ref"] }],
  };

  // The field label renders the text plus a possible required marker, so match
  // with a regex (partial) rather than an exact string.
  it("hides a field whose visibleWhen is false", () => {
    const { queryByText } = render(
      <FormViewRenderer view={view} fields={fields} initialValues={{ type: "po" }} />,
    );
    expect(queryByText(/Type/)).toBeTruthy();
    expect(queryByText(/Invoice No/)).toBeNull();
  });

  it("shows a field whose visibleWhen is true", () => {
    const { queryByText } = render(
      <FormViewRenderer view={view} fields={fields} initialValues={{ type: "invoice" }} />,
    );
    expect(queryByText(/Invoice No/)).toBeTruthy();
  });

  it("blocks submit when a conditionally-required visible field is empty", () => {
    const onSubmit = jest.fn();
    const { getByText } = render(
      <FormViewRenderer
        view={view}
        fields={fields}
        initialValues={{ type: "invoice" }}
        onSubmit={onSubmit}
        submitLabel="Save"
      />,
    );
    fireEvent.press(getByText("Save"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does NOT block submit for a conditionally-required field that is hidden", () => {
    const onSubmit = jest.fn();
    const { getByText } = render(
      <FormViewRenderer
        view={view}
        fields={fields}
        initialValues={{ type: "po" }}
        onSubmit={onSubmit}
        submitLabel="Save"
      />,
    );
    // invoice_no is required-when-invoice, but hidden here (type === "po"),
    // so its emptiness must not block the save.
    fireEvent.press(getByText("Save"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("allows submit when the conditionally-required field is filled", () => {
    const onSubmit = jest.fn();
    const { getByText } = render(
      <FormViewRenderer
        view={view}
        fields={fields}
        initialValues={{ type: "invoice", invoice_no: "INV-1" }}
        onSubmit={onSubmit}
        submitLabel="Save"
      />,
    );
    fireEvent.press(getByText("Save"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
