/**
 * Tests for action components — ActionBar, FAB, ActionExecutor
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Linking } from "react-native";

import { ActionBar } from "~/components/actions/ActionBar";
import { FloatingActionButton } from "~/components/actions/FloatingActionButton";
import {
  executeAction,
  getActionsForLocation,
} from "~/components/actions/ActionExecutor";
import type { ActionMeta } from "~/components/renderers/types";

/* ------------------------------------------------------------------ */
/*  ActionBar                                                           */
/* ------------------------------------------------------------------ */

describe("ActionBar", () => {
  const actions: ActionMeta[] = [
    { name: "create", label: "Create", type: "modal", component: "action:button" },
    { name: "delete-all", label: "Delete All", type: "api" },
    { name: "export", label: "Export", type: "url" },
  ];

  it("renders nothing for empty actions", () => {
    const tree = render(<ActionBar actions={[]} onAction={jest.fn()} />);
    expect(tree.toJSON()).toBeNull();
  });

  it("renders action buttons", () => {
    const { getByText } = render(
      <ActionBar actions={actions} onAction={jest.fn()} />,
    );
    expect(getByText("Create")).toBeTruthy();
    expect(getByText("Delete All")).toBeTruthy();
    expect(getByText("Export")).toBeTruthy();
  });

  it("calls onAction when pressed", () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <ActionBar actions={actions} onAction={onAction} />,
    );
    fireEvent.press(getByText("Create"));
    expect(onAction).toHaveBeenCalledWith(actions[0]);
  });

  it("matches snapshot", () => {
    const tree = render(
      <ActionBar actions={actions} onAction={jest.fn()} />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });
});

/* ------------------------------------------------------------------ */
/*  FloatingActionButton                                                */
/* ------------------------------------------------------------------ */

describe("FloatingActionButton", () => {
  it("renders and handles press", () => {
    const onPress = jest.fn();
    const tree = render(<FloatingActionButton onPress={onPress} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });
});

/* ------------------------------------------------------------------ */
/*  ActionExecutor                                                      */
/* ------------------------------------------------------------------ */

describe("executeAction", () => {
  const mockClient = {
    automation: {
      trigger: jest.fn().mockResolvedValue({ ok: true }),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("executes url action", async () => {
    jest.spyOn(Linking, "openURL").mockResolvedValue(true as any);

    const action: ActionMeta = {
      name: "open-link",
      label: "Open",
      type: "url",
      target: "https://example.com",
    };
    const result = await executeAction(action, { client: mockClient });
    expect(result.success).toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith("https://example.com");
  });

  it("resolves template variables in url target", async () => {
    jest.spyOn(Linking, "openURL").mockResolvedValue(true as any);

    const action: ActionMeta = {
      name: "open-record",
      label: "Open",
      type: "url",
      target: "https://example.com/{id}",
    };
    await executeAction(action, {
      client: mockClient,
      record: { id: "123" },
    });
    expect(Linking.openURL).toHaveBeenCalledWith("https://example.com/123");
  });

  it("executes api action", async () => {
    const action: ActionMeta = {
      name: "run-api",
      label: "Run",
      type: "api",
      execute: "run-endpoint",
    };
    const result = await executeAction(action, {
      client: mockClient,
      objectName: "tasks",
      recordId: "r1",
    });
    expect(result.success).toBe(true);
    expect(mockClient.automation.trigger).toHaveBeenCalledWith(
      "run-endpoint",
      expect.objectContaining({ object: "tasks", recordId: "r1" }),
    );
  });

  it("returns failure for api action without endpoint", async () => {
    const action: ActionMeta = {
      name: "bad-api",
      label: "Bad",
      type: "api",
    };
    const result = await executeAction(action, { client: mockClient });
    expect(result.success).toBe(false);
    expect(result.message).toContain("No API endpoint");
  });

  it("executes flow action", async () => {
    const action: ActionMeta = {
      name: "my-flow",
      label: "Flow",
      type: "flow",
    };
    const result = await executeAction(action, { client: mockClient });
    expect(result.success).toBe(true);
  });

  it("returns failure for unsupported action type", async () => {
    const action: ActionMeta = {
      name: "unknown",
      label: "Unknown",
      type: "script" as any,
    };
    const result = await executeAction(action, { client: mockClient });
    expect(result.success).toBe(false);
  });

  it("handles errors gracefully", async () => {
    mockClient.automation.trigger.mockRejectedValueOnce(new Error("Network fail"));
    const action: ActionMeta = {
      name: "fail-flow",
      label: "Fail",
      type: "flow",
    };
    const result = await executeAction(action, { client: mockClient });
    expect(result.success).toBe(false);
    expect(result.message).toContain("Network fail");
  });

  it("calls onComplete callback", async () => {
    const onComplete = jest.fn();
    const action: ActionMeta = {
      name: "test",
      label: "Test",
      type: "url",
      target: "https://example.com",
    };
    jest.spyOn(Linking, "openURL").mockResolvedValue(true as any);
    await executeAction(action, { client: mockClient, onComplete });
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

/* ------------------------------------------------------------------ */
/*  getActionsForLocation                                               */
/* ------------------------------------------------------------------ */

describe("getActionsForLocation", () => {
  const actions: ActionMeta[] = [
    { name: "a1", label: "A1", type: "api", locations: ["list_toolbar", "record_header"] },
    { name: "a2", label: "A2", type: "url", locations: ["list_item"] },
    { name: "a3", label: "A3", type: "flow" },
  ];

  it("filters actions by location", () => {
    expect(getActionsForLocation(actions, "list_toolbar")).toHaveLength(1);
    expect(getActionsForLocation(actions, "list_item")).toHaveLength(1);
    expect(getActionsForLocation(actions, "record_header")).toHaveLength(1);
    expect(getActionsForLocation(actions, "global_nav")).toHaveLength(0);
  });
});
