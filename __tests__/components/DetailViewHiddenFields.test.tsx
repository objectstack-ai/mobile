import React from "react";
import { render } from "@testing-library/react-native";

import { DetailViewRenderer } from "~/components/renderers/DetailViewRenderer";
import type { FieldDefinition } from "~/components/renderers/types";

/**
 * The detail screen falls back to auto-laying-out a record's keys when there is
 * no curated form view. That fallback must mirror the form's `isEntryField`
 * filtering so internal plumbing (multi-tenancy keys the server injects) and
 * metadata-hidden fields never leak into the layout — see the P0 UX fix where
 * `Organization Id` was leading the task detail.
 */
describe("DetailViewRenderer — fallback field filtering", () => {
  const record = {
    id: "rec_1",
    subject: "Learn ObjectStack",
    status: "completed",
    organization_id: "org_123",
    secret_token: "shhh",
    created_at: "2026-01-01T00:00:00.000Z",
  };

  const fields: FieldDefinition[] = [
    { name: "subject", label: "Subject", type: "text" },
    { name: "status", label: "Status", type: "text" },
    // Declared but hidden by metadata — must be filtered like the form does.
    { name: "secret_token", label: "Secret Token", type: "text", hidden: true },
  ];

  it("drops injected tenancy fields and metadata-hidden fields, keeps business fields", () => {
    const { queryByText, getByText } = render(
      <DetailViewRenderer record={record} fields={fields} />,
    );

    // Business fields remain.
    expect(getByText("Subject")).toBeTruthy();
    expect(getByText("Status")).toBeTruthy();

    // Internal tenancy plumbing never surfaces.
    expect(queryByText("Organization Id")).toBeNull();
    expect(queryByText(/organization/i)).toBeNull();

    // A field the metadata marks hidden is filtered out of the fallback too.
    expect(queryByText("Secret Token")).toBeNull();
  });

  it("collapses empty-valued fields in the auto-layout", () => {
    const sparse = {
      id: "rec_2",
      subject: "Has a subject",
      description: "", // empty string
      due_date: null, // null
      tags: [], // empty array
    };
    const sparseFields: FieldDefinition[] = [
      { name: "subject", label: "Subject", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "due_date", label: "Due Date", type: "date" },
      { name: "tags", label: "Tags", type: "tags" },
    ];
    const { queryByText, getByText } = render(
      <DetailViewRenderer record={sparse} fields={sparseFields} />,
    );

    // Populated field shows; empty ones are collapsed (no row of "—").
    expect(getByText("Subject")).toBeTruthy();
    expect(queryByText("Description")).toBeNull();
    expect(queryByText("Due Date")).toBeNull();
    expect(queryByText("Tags")).toBeNull();
  });

  it("keeps every field (even empty) when a curated view lists them", () => {
    const sparse = { id: "rec_3", subject: "S", description: "" };
    const sparseFields: FieldDefinition[] = [
      { name: "subject", label: "Subject", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
    ];
    const { getByText } = render(
      <DetailViewRenderer
        record={sparse}
        fields={sparseFields}
        view={{ sections: [{ fields: ["subject", "description"] }] }}
      />,
    );
    // Curated view honours the author's choice — empty Description still shows.
    expect(getByText("Subject")).toBeTruthy();
    expect(getByText("Description")).toBeTruthy();
  });
});
