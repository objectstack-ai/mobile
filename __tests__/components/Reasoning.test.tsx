import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Reasoning } from "~/components/ui/Reasoning";

describe("Reasoning", () => {
  it("renders nothing when reasoning is empty", () => {
    expect(render(<Reasoning reasoning="" />).toJSON()).toBeNull();
    expect(render(<Reasoning reasoning="   " />).toJSON()).toBeNull();
  });

  it("is collapsed by default and expands on tap", () => {
    const { getByLabelText, getByText, queryByText } = render(
      <Reasoning reasoning="First I considered the options." />,
    );
    expect(getByText("Reasoning")).toBeTruthy();
    expect(queryByText("First I considered the options.")).toBeNull();
    fireEvent.press(getByLabelText("Reasoning"));
    expect(getByText("First I considered the options.")).toBeTruthy();
  });
});
