/**
 * Tests for RejectReasonDialog — requires a non-empty reason before rejecting.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

jest.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (k: string) =>
      ({
        "approvals.reject": "Reject",
        "approvals.rejectReason": "Provide a reason for rejection.",
        "approvals.rejectReasonPlaceholder": "Reason…",
        "common.cancel": "Cancel",
      })[k] ?? k,
  }),
}));

import { RejectReasonDialog } from "~/components/approvals/RejectReasonDialog";

describe("RejectReasonDialog", () => {
  it("disables Reject until a reason is entered, then submits the trimmed reason", () => {
    const onReject = jest.fn();
    const { getAllByText, getByPlaceholderText } = render(
      <RejectReasonDialog open onCancel={jest.fn()} onReject={onReject} />,
    );
    // "Reject" is both the dialog title and the button label — the button is last.
    const rejectButton = () => getAllByText("Reject").at(-1)!;

    // Pressing Reject with an empty reason does nothing (button disabled).
    fireEvent.press(rejectButton());
    expect(onReject).not.toHaveBeenCalled();

    fireEvent.changeText(getByPlaceholderText("Reason…"), "  Over budget  ");
    fireEvent.press(rejectButton());
    expect(onReject).toHaveBeenCalledWith("Over budget");
  });

  it("calls onCancel from the Cancel button", () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <RejectReasonDialog open onCancel={onCancel} onReject={jest.fn()} />,
    );
    fireEvent.press(getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });
});
