/**
 * Snapshot tests for the CollaborationOverlay component.
 */
import React from "react";
import { render } from "@testing-library/react-native";

import { CollaborationOverlay } from "~/components/realtime/CollaborationOverlay";
import type { CollaborationParticipant } from "~/hooks/useCollaboration";

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const participants: CollaborationParticipant[] = [
  {
    userId: "user1",
    name: "Alice",
    cursor: { x: 100, y: 200, field: "title" },
    status: "active",
    color: "#3b82f6",
    lastSeen: "2026-01-01T00:00:00Z",
  },
];

/* ------------------------------------------------------------------ */
/*  CollaborationOverlay snapshots                                     */
/* ------------------------------------------------------------------ */

describe("CollaborationOverlay", () => {
  it("renders null when no participants", () => {
    const tree = render(
      <CollaborationOverlay participants={[]} />,
    );
    expect(tree.toJSON()).toBeNull();
  });

  it("renders participant cursors", () => {
    const tree = render(
      <CollaborationOverlay participants={participants} />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders without cursors when showCursors is false", () => {
    const tree = render(
      <CollaborationOverlay participants={participants} showCursors={false} />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
