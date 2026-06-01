/**
 * Tests for RecordStateMachines — validates that available transitions render
 * for the current state and fire onTransition, and stay hidden when read-only.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import { RecordStateMachines } from "~/components/workflow/RecordStateMachines";
import type { RecordStateMachine } from "~/hooks/useStateMachines";

const machine: RecordStateMachine = {
  key: "lifecycle",
  title: "Lifecycle",
  field: "stage",
  currentState: "proposal",
  states: [
    { name: "proposal", type: "normal", label: "Proposal" },
    { name: "negotiation", type: "normal", label: "Negotiation" },
    { name: "closed_lost", type: "final", label: "Lost" },
  ],
  transitions: [
    { from: "proposal", to: "negotiation", event: "NEGOTIATE", label: "Enter negotiation" },
    { from: "proposal", to: "closed_lost", event: "LOSE", label: "Proposal rejected" },
    { from: "negotiation", to: "closed_lost", event: "LOSE", label: "Lost late" },
  ],
};

describe("RecordStateMachines", () => {
  it("renders available transitions for the current state and fires onTransition", () => {
    const onTransition = jest.fn();
    // Buttons carry a unique a11y label "<label> → <target>"; the diagram
    // reuses the transition text, so query the buttons by accessibility label.
    const { getByLabelText, queryByLabelText } = render(
      <RecordStateMachines machines={[machine]} onTransition={onTransition} />,
    );

    // Only the current state's (proposal) outgoing transitions are actionable.
    expect(getByLabelText("Enter negotiation → Negotiation")).toBeTruthy();
    expect(getByLabelText("Proposal rejected → Lost")).toBeTruthy();
    // A transition from another state is not offered as an action button.
    expect(queryByLabelText("Lost late → Lost")).toBeNull();

    fireEvent.press(getByLabelText("Enter negotiation → Negotiation"));
    expect(onTransition).toHaveBeenCalledTimes(1);
    expect(onTransition.mock.calls[0][1]).toMatchObject({
      to: "negotiation",
      event: "NEGOTIATE",
    });
  });

  it("renders read-only (no action buttons) when onTransition is omitted", () => {
    const { queryByLabelText } = render(<RecordStateMachines machines={[machine]} />);
    expect(queryByLabelText("Enter negotiation → Negotiation")).toBeNull();
  });

  it("renders nothing when there are no machines", () => {
    const { toJSON } = render(<RecordStateMachines machines={[]} />);
    expect(toJSON()).toBeNull();
  });
});
