import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

import "~/lib/i18n"; // initialize i18next so t() resolves (the component chain doesn't)
import { QuickCreateSheet } from "~/components/home/QuickCreateSheet";
import type { AppMeta } from "~/hooks/useApps";

// The global expo-router mock hands back a fresh `push` per call, so override it
// here with a shared spy we can assert on.
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

const apps: AppMeta[] = [
  {
    name: "todo_app",
    label: "Todo",
    navigation: [
      {
        id: "g1",
        type: "group",
        label: "Tasks",
        children: [
          { id: "n1", type: "object", label: "All Tasks", objectName: "todo_task" },
        ],
      },
      // Non-object leaves are ignored by quick-create.
      { id: "n2", type: "dashboard", label: "Dashboard", dashboardName: "d1" },
    ],
  },
  {
    name: "crm",
    label: "CRM",
    navigation: [
      { id: "n3", type: "object", label: "Contacts", objectName: "contact" },
      // Same app/object surfaced under a second view — must dedupe.
      { id: "n4", type: "object", label: "Contacts (Kanban)", objectName: "contact" },
    ],
  },
];

describe("QuickCreateSheet", () => {
  beforeEach(() => mockPush.mockClear());

  it("lists creatable objects flattened from the apps' navigation, deduped", () => {
    const { getByText, queryByText, queryAllByText } = render(
      <QuickCreateSheet open onOpenChange={jest.fn()} apps={apps} />,
    );

    // Object leaves (incl. those nested in a group) surface.
    expect(getByText("All Tasks")).toBeTruthy();
    expect(getByText("Contacts")).toBeTruthy();
    // The dashboard leaf is not a creatable object.
    expect(queryByText("Dashboard")).toBeNull();
    // The second view over `contact` is deduped away.
    expect(queryByText("Contacts (Kanban)")).toBeNull();
    expect(queryAllByText("Contacts")).toHaveLength(1);
  });

  it("opens the object's create form and closes the sheet on press", () => {
    const onOpenChange = jest.fn();
    const { getByLabelText } = render(
      <QuickCreateSheet open onOpenChange={onOpenChange} apps={apps} />,
    );

    fireEvent.press(getByLabelText("All Tasks"));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockPush).toHaveBeenCalledWith("/(app)/todo_app/todo_task/new");
  });

  it("shows an empty hint when no app publishes a creatable object", () => {
    const { getByText } = render(
      <QuickCreateSheet open onOpenChange={jest.fn()} apps={[]} />,
    );
    expect(getByText("No objects available to create.")).toBeTruthy();
  });
});
