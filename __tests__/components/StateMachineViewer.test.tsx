/**
 * Snapshot tests for the StateMachineViewer component.
 */
import React from "react";
import { render } from "@testing-library/react-native";

import { StateMachineViewer } from "~/components/workflow/StateMachineViewer";

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const states = [
  { name: "draft", type: "initial" as const, label: "Draft" },
  { name: "published", type: "final" as const, label: "Published" },
];

const transitions = [
  { from: "draft", to: "published", event: "publish", label: "Publish" },
];

/* ------------------------------------------------------------------ */
/*  StateMachineViewer snapshots                                       */
/* ------------------------------------------------------------------ */

describe("StateMachineViewer", () => {
  it("renders empty state when no states", () => {
    const tree = render(
      <StateMachineViewer states={[]} transitions={[]} />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders states with transitions", () => {
    const tree = render(
      <StateMachineViewer states={states} transitions={transitions} />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("highlights current state", () => {
    const tree = render(
      <StateMachineViewer
        states={states}
        transitions={transitions}
        currentState="draft"
      />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
