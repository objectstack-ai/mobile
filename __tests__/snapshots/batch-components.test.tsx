/**
 * Snapshot tests for batch and action components.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

import { BatchActionBar } from "~/components/batch/BatchActionBar";
import { BatchProgressIndicator } from "~/components/batch/BatchProgressIndicator";

/* ------------------------------------------------------------------ */
/*  BatchActionBar                                                      */
/* ------------------------------------------------------------------ */

describe("BatchActionBar", () => {
  it("renders nothing when no selection", () => {
    const tree = render(
      <BatchActionBar selectedCount={0} onClearSelection={jest.fn()} />,
    );
    expect(tree.toJSON()).toBeNull();
  });

  it("renders selection count", () => {
    const { getByText } = render(
      <BatchActionBar selectedCount={3} onClearSelection={jest.fn()} />,
    );
    expect(getByText("3 selected")).toBeTruthy();
  });

  it("shows delete button when onBatchDelete is provided", () => {
    const { getByText } = render(
      <BatchActionBar
        selectedCount={2}
        onClearSelection={jest.fn()}
        onBatchDelete={jest.fn()}
      />,
    );
    expect(getByText("Delete")).toBeTruthy();
  });

  it("shows edit button when onBatchEdit is provided", () => {
    const { getByText } = render(
      <BatchActionBar
        selectedCount={1}
        onClearSelection={jest.fn()}
        onBatchEdit={jest.fn()}
      />,
    );
    expect(getByText("Edit")).toBeTruthy();
  });

  it("matches snapshot with all actions", () => {
    const tree = render(
      <BatchActionBar
        selectedCount={5}
        onClearSelection={jest.fn()}
        onBatchDelete={jest.fn()}
        onBatchEdit={jest.fn()}
      />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });
});

/* ------------------------------------------------------------------ */
/*  BatchProgressIndicator                                              */
/* ------------------------------------------------------------------ */

describe("BatchProgressIndicator", () => {
  it("renders nothing when no progress or result", () => {
    const tree = render(
      <BatchProgressIndicator progress={null} result={null} />,
    );
    expect(tree.toJSON()).toBeNull();
  });

  it("renders in-progress state", () => {
    const tree = render(
      <BatchProgressIndicator
        progress={{ total: 10, completed: 3, failed: 0 }}
        result={null}
      />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders completed result", () => {
    const tree = render(
      <BatchProgressIndicator
        progress={{ total: 10, completed: 10, failed: 0 }}
        result={{
          succeeded: 9,
          failed: 1,
          skipped: 0,
          errors: [{ recordId: "r1", message: "Not found" }],
        }}
      />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders result with skipped count", () => {
    const { getByText } = render(
      <BatchProgressIndicator
        progress={{ total: 10, completed: 10, failed: 0 }}
        result={{
          succeeded: 7,
          failed: 1,
          skipped: 2,
          errors: [],
        }}
      />,
    );
    expect(getByText(/2 skipped/)).toBeTruthy();
  });

  it("shows failed count in progress", () => {
    const { getByText } = render(
      <BatchProgressIndicator
        progress={{ total: 10, completed: 5, failed: 2 }}
        result={null}
      />,
    );
    expect(getByText("2 failed")).toBeTruthy();
  });
});
