import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";

import { UndoSnackbar } from "~/components/common/UndoSnackbar";

describe("UndoSnackbar", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders when visible", () => {
    const { getByTestId } = render(
      <UndoSnackbar message="Item deleted" onUndo={jest.fn()} visible={true} />
    );
    expect(getByTestId("undo-snackbar")).toBeTruthy();
  });

  it("does not render when not visible", () => {
    const { queryByTestId } = render(
      <UndoSnackbar message="Item deleted" onUndo={jest.fn()} visible={false} />
    );
    expect(queryByTestId("undo-snackbar")).toBeNull();
  });

  it("displays the message text", () => {
    const { getByTestId } = render(
      <UndoSnackbar message="Record removed" onUndo={jest.fn()} visible={true} />
    );
    expect(getByTestId("undo-snackbar-message").props.children).toBe("Record removed");
  });

  it("calls onUndo when undo is pressed", () => {
    const onUndo = jest.fn();
    const { getByTestId } = render(
      <UndoSnackbar message="Deleted" onUndo={onUndo} visible={true} />
    );
    fireEvent.press(getByTestId("undo-snackbar-undo"));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("auto-hides after duration", () => {
    const { queryByTestId } = render(
      <UndoSnackbar message="Deleted" onUndo={jest.fn()} visible={true} duration={3000} />
    );
    expect(queryByTestId("undo-snackbar")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(queryByTestId("undo-snackbar")).toBeNull();
  });

  it("has correct accessibility attributes", () => {
    const { getByTestId } = render(
      <UndoSnackbar message="Deleted" onUndo={jest.fn()} visible={true} />
    );
    const root = getByTestId("undo-snackbar");
    expect(root.props.accessibilityRole).toBe("alert");
    expect(root.props.accessibilityLabel).toBe("Deleted");
  });

  it("uses custom testID", () => {
    const { getByTestId } = render(
      <UndoSnackbar message="Test" onUndo={jest.fn()} visible={true} testID="my-snackbar" />
    );
    expect(getByTestId("my-snackbar")).toBeTruthy();
  });
});
