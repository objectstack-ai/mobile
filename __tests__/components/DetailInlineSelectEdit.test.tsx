import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

import { DetailViewRenderer } from "~/components/renderers/DetailViewRenderer";
import type { FieldDefinition, FormViewMeta } from "~/components/renderers/types";

/**
 * Inline select/status editing on the detail screen. The editable badge is an
 * internal component (`EditableSelectField`), so it's exercised through
 * `DetailViewRenderer` with an `onFieldEdit` handler.
 */
describe("DetailViewRenderer — inline select edit", () => {
  const record = { id: "r1", status: "todo" };
  const fields: FieldDefinition[] = [
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "todo", label: "To Do" },
        { value: "in_progress", label: "In Progress" },
        { value: "done", label: "Done" },
      ],
    },
  ];
  // A curated view guarantees the field renders regardless of value.
  const view: FormViewMeta = { sections: [{ fields: ["status"] }] };

  it("stays read-only (no edit affordance) without an onFieldEdit handler", () => {
    const { getByText, queryByLabelText } = render(
      <DetailViewRenderer record={record} fields={fields} view={view} />,
    );
    // The current value still shows as its option label…
    expect(getByText("To Do")).toBeTruthy();
    // …but there is no tappable edit control.
    expect(queryByLabelText("Edit Status")).toBeNull();
  });

  it("opens the picker and persists a new value via onFieldEdit", () => {
    const onFieldEdit = jest.fn().mockResolvedValue(undefined);
    const { getByLabelText } = render(
      <DetailViewRenderer
        record={record}
        fields={fields}
        view={view}
        onFieldEdit={onFieldEdit}
      />,
    );

    fireEvent.press(getByLabelText("Edit Status"));
    fireEvent.press(getByLabelText("In Progress"));

    expect(onFieldEdit).toHaveBeenCalledWith("status", "in_progress");
  });

  it("does not persist when the current value is re-selected", () => {
    const onFieldEdit = jest.fn();
    const { getByLabelText } = render(
      <DetailViewRenderer
        record={record}
        fields={fields}
        view={view}
        onFieldEdit={onFieldEdit}
      />,
    );

    fireEvent.press(getByLabelText("Edit Status"));
    fireEvent.press(getByLabelText("To Do")); // already the current value

    expect(onFieldEdit).not.toHaveBeenCalled();
  });
});
