/**
 * Snapshot tests for the AgentProgress component.
 */
import React from "react";
import { render } from "@testing-library/react-native";

import { AgentProgress } from "~/components/ai/AgentProgress";
import type { AgentTask } from "~/hooks/useAgent";

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const baseTask: AgentTask = {
  id: "task-1",
  status: "running",
  progress: 50,
  agentId: "summarizer",
  createdAt: "2026-01-01T00:00:00Z",
};

/* ------------------------------------------------------------------ */
/*  AgentProgress snapshots                                            */
/* ------------------------------------------------------------------ */

describe("AgentProgress", () => {
  it("renders null when task is null", () => {
    const tree = render(<AgentProgress task={null} />);
    expect(tree.toJSON()).toBeNull();
  });

  it("renders running task with progress", () => {
    const tree = render(<AgentProgress task={baseTask} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders completed task", () => {
    const task: AgentTask = { ...baseTask, status: "completed", progress: 100 };
    const tree = render(<AgentProgress task={task} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders failed task with error", () => {
    const task: AgentTask = {
      ...baseTask,
      status: "failed",
      progress: 30,
      error: "Agent timed out",
    };
    const tree = render(<AgentProgress task={task} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders cancel button when running and onCancel provided", () => {
    const tree = render(
      <AgentProgress task={baseTask} onCancel={jest.fn()} />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
