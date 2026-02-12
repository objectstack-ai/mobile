import React from "react";
import { render } from "@testing-library/react-native";

import { SkeletonDashboard } from "~/components/common/SkeletonDashboard";

describe("SkeletonDashboard", () => {
  it("renders with default props", () => {
    const { getByTestId } = render(<SkeletonDashboard />);
    expect(getByTestId("skeleton-dashboard")).toBeTruthy();
  });

  it("renders the correct number of cards", () => {
    const { getByTestId, queryByTestId } = render(<SkeletonDashboard cards={3} />);
    expect(getByTestId("skeleton-dashboard-card-0")).toBeTruthy();
    expect(getByTestId("skeleton-dashboard-card-1")).toBeTruthy();
    expect(getByTestId("skeleton-dashboard-card-2")).toBeTruthy();
    expect(queryByTestId("skeleton-dashboard-card-3")).toBeNull();
  });

  it("has correct accessibility attributes", () => {
    const { getByTestId } = render(<SkeletonDashboard />);
    const root = getByTestId("skeleton-dashboard");
    expect(root.props.accessibilityLabel).toBe("Loading dashboard");
    expect(root.props.accessibilityRole).toBe("progressbar");
  });

  it("uses custom testID", () => {
    const { getByTestId } = render(<SkeletonDashboard testID="my-dash" />);
    expect(getByTestId("my-dash")).toBeTruthy();
  });
});
