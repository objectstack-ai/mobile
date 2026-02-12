/**
 * Snapshot tests for the FlowViewer component.
 */
import React from "react";
import { render } from "@testing-library/react-native";

import { FlowViewer } from "~/components/automation/FlowViewer";

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const nodes = [
  { id: "1", type: "trigger", label: "Start" },
  { id: "2", type: "action", label: "Send Email" },
];

const edges = [{ id: "e1", source: "1", target: "2", label: "On Submit" }];

/* ------------------------------------------------------------------ */
/*  FlowViewer snapshots                                               */
/* ------------------------------------------------------------------ */

describe("FlowViewer", () => {
  it("renders empty state when no nodes", () => {
    const tree = render(<FlowViewer nodes={[]} edges={[]} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders nodes with edges", () => {
    const tree = render(<FlowViewer nodes={nodes} edges={edges} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
