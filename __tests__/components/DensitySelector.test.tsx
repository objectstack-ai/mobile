import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

import { DensitySelector } from "~/components/common/DensitySelector";
import { useUIStore } from "~/stores/ui-store";

describe("DensitySelector", () => {
  beforeEach(() => {
    // Reset the shared store to the default before each case.
    useUIStore.setState({ density: "comfortable" });
  });

  it("renders both density options", () => {
    const { getByText } = render(<DensitySelector />);
    expect(getByText("Comfortable")).toBeTruthy();
    expect(getByText("Compact")).toBeTruthy();
  });

  it("switches the global density to compact on press", () => {
    const { getByLabelText } = render(<DensitySelector />);
    expect(useUIStore.getState().density).toBe("comfortable");

    fireEvent.press(getByLabelText("Compact"));
    expect(useUIStore.getState().density).toBe("compact");
  });

  it("toggles back to comfortable", () => {
    useUIStore.setState({ density: "compact" });
    const { getByLabelText } = render(<DensitySelector />);

    fireEvent.press(getByLabelText("Comfortable"));
    expect(useUIStore.getState().density).toBe("comfortable");
  });
});
