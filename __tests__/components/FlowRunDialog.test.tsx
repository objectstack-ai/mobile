/**
 * Tests for FlowRunDialog — collects an input-driven flow's variables and hands
 * them back as a params object when Run is pressed.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

jest.mock("react-i18next", () => ({
  // lib/i18n calls i18n.use(initReactI18next) on import.
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (k: string) =>
      k === "workflow.runLabel"
        ? "Run"
        : k === "common.cancel"
          ? "Cancel"
          : k === "workflow.runFlow"
            ? "Run Flow"
            : k,
  }),
}));

import { FlowRunDialog } from "~/components/automation/FlowRunDialog";

const inputs = [
  { name: "leadId", type: "text", isInput: true },
  { name: "opportunityName", type: "text", isInput: true },
];

describe("FlowRunDialog", () => {
  it("renders a field per input and a Run/Cancel pair", () => {
    const { getByText } = render(
      <FlowRunDialog
        open
        flowLabel="Lead Conversion"
        inputs={inputs}
        onCancel={jest.fn()}
        onRun={jest.fn()}
      />,
    );
    expect(getByText("Lead Id")).toBeTruthy();
    expect(getByText("Opportunity Name")).toBeTruthy();
    expect(getByText("Run")).toBeTruthy();
    expect(getByText("Cancel")).toBeTruthy();
  });

  it("calls onRun with a params object keyed by variable name", () => {
    const onRun = jest.fn();
    const { getByText } = render(
      <FlowRunDialog open flowLabel="f" inputs={inputs} onCancel={jest.fn()} onRun={onRun} />,
    );
    fireEvent.press(getByText("Run"));
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(Object.keys(onRun.mock.calls[0][0]).sort()).toEqual(["leadId", "opportunityName"]);
  });

  it("calls onCancel from the Cancel button", () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <FlowRunDialog open flowLabel="f" inputs={inputs} onCancel={onCancel} onRun={jest.fn()} />,
    );
    fireEvent.press(getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });
});
