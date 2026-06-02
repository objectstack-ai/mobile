/**
 * Tests for ApprovalTargetCard — renders the target record's title plus its
 * populated business fields (skipping system/empty fields).
 */
import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({ t: (k: string) => k }),
}));

import { ApprovalTargetCard } from "~/components/approvals/ApprovalTargetCard";
import type { FieldDefinition } from "~/components/renderers";
import type { ObjectMeta } from "~/hooks/useObjectMeta";

const meta = { name: "server_item", label: "Server Item" } as ObjectMeta;
const fields: FieldDefinition[] = [
  { name: "name", label: "Name", type: "text" } as FieldDefinition,
  { name: "description", label: "Description", type: "textarea" } as FieldDefinition,
  { name: "created_at", label: "Created At", type: "datetime" } as FieldDefinition,
];

describe("ApprovalTargetCard", () => {
  it("renders the object label, record title, and populated fields", () => {
    const record = {
      id: "1",
      name: "Wayne Enterprise License",
      description: "Needs VP sign-off.",
      created_at: "2026-06-02T00:00:00Z",
    };
    const { getByText, getAllByText, queryByText } = render(
      <ApprovalTargetCard objectLabel="Server Item" meta={meta} fields={fields} record={record} />,
    );
    expect(getByText("Server Item")).toBeTruthy();
    // Title resolves to the record's name (appears as title + field value).
    expect(getAllByText("Wayne Enterprise License").length).toBeGreaterThan(0);
    expect(getByText("Needs VP sign-off.")).toBeTruthy();
    // System field is not previewed.
    expect(queryByText("Created At")).toBeNull();
  });

  it("shows a placeholder when the record is missing", () => {
    const { getByText } = render(
      <ApprovalTargetCard objectLabel="Server Item" meta={meta} fields={fields} record={null} />,
    );
    expect(getByText("—")).toBeTruthy();
  });
});
