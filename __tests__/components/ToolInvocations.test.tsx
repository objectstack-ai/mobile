import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ToolInvocations } from "~/components/ui/ToolInvocations";
import type { ToolInvocation } from "~/lib/ai-chat";

const tool = (over: Partial<ToolInvocation> = {}): ToolInvocation => ({
  id: "t1",
  name: "query_data",
  state: "done",
  ...over,
});

describe("ToolInvocations", () => {
  it("renders nothing for an empty list", () => {
    const { toJSON } = render(<ToolInvocations tools={[]} />);
    expect(toJSON()).toBeNull();
  });

  it("shows the humanized tool name collapsed by default", () => {
    const { getByText, queryByText } = render(
      <ToolInvocations tools={[tool({ input: { q: 1 }, output: "ok" })]} />,
    );
    expect(getByText("Query Data")).toBeTruthy();
    // collapsed: input/result hidden
    expect(queryByText("Input")).toBeNull();
    expect(queryByText("Result")).toBeNull();
  });

  it("expands to reveal input and result on tap", () => {
    const { getByText, getByLabelText } = render(
      <ToolInvocations tools={[tool({ input: { q: 1 }, output: "42 rows" })]} />,
    );
    fireEvent.press(getByLabelText("Tool query_data, done"));
    expect(getByText("Input")).toBeTruthy();
    expect(getByText("Result")).toBeTruthy();
    expect(getByText("42 rows")).toBeTruthy();
  });

  it("hides the result for a still-running tool", () => {
    const { getByLabelText, getByText, queryByText } = render(
      <ToolInvocations tools={[tool({ state: "running", input: { q: 1 } })]} />,
    );
    fireEvent.press(getByLabelText("Tool query_data, running"));
    expect(getByText("Input")).toBeTruthy();
    expect(queryByText("Result")).toBeNull();
  });

  it("renders one row per tool", () => {
    const { getByText } = render(
      <ToolInvocations
        tools={[tool({ id: "a", name: "list_objects" }), tool({ id: "b", name: "query_data" })]}
      />,
    );
    expect(getByText("List Objects")).toBeTruthy();
    expect(getByText("Query Data")).toBeTruthy();
  });
});
