import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

import { FloatingActionButton } from "~/components/common/FloatingActionButton";
import type { FABAction } from "~/components/common/FloatingActionButton";

describe("FloatingActionButton", () => {
  it("renders with default props", () => {
    const { getByTestId } = render(<FloatingActionButton />);
    expect(getByTestId("fab")).toBeTruthy();
    expect(getByTestId("fab-button")).toBeTruthy();
  });

  it("calls onPress in simple mode", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<FloatingActionButton onPress={onPress} />);
    fireEvent.press(getByTestId("fab-button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("expands to show actions when pressed with actions", () => {
    const actions: FABAction[] = [
      { id: "a1", label: "Action 1", onPress: jest.fn() },
      { id: "a2", label: "Action 2", onPress: jest.fn() },
    ];
    const { getByTestId, queryByTestId } = render(
      <FloatingActionButton actions={actions} />
    );

    // Actions not visible initially
    expect(queryByTestId("fab-action-a1")).toBeNull();

    // Press to expand
    fireEvent.press(getByTestId("fab-button"));
    expect(getByTestId("fab-action-a1")).toBeTruthy();
    expect(getByTestId("fab-action-a2")).toBeTruthy();
  });

  it("calls action onPress and collapses", () => {
    const actionFn = jest.fn();
    const actions: FABAction[] = [
      { id: "a1", label: "Action 1", onPress: actionFn },
    ];
    const { getByTestId, queryByTestId } = render(
      <FloatingActionButton actions={actions} />
    );

    fireEvent.press(getByTestId("fab-button"));
    fireEvent.press(getByTestId("fab-action-a1"));

    expect(actionFn).toHaveBeenCalledTimes(1);
    // Should collapse after action press
    expect(queryByTestId("fab-action-a1")).toBeNull();
  });

  it("has correct accessibility labels", () => {
    const { getByTestId } = render(<FloatingActionButton />);
    expect(getByTestId("fab-button").props.accessibilityRole).toBe("button");
  });

  it("uses custom testID", () => {
    const { getByTestId } = render(<FloatingActionButton testID="my-fab" />);
    expect(getByTestId("my-fab")).toBeTruthy();
  });
});
