import React from "react";
import { render } from "@testing-library/react-native";

import { SkeletonDetail } from "~/components/common/SkeletonDetail";

describe("SkeletonDetail", () => {
  it("renders with default props", () => {
    const { getByTestId } = render(<SkeletonDetail />);
    expect(getByTestId("skeleton-detail")).toBeTruthy();
  });

  it("renders the correct number of sections", () => {
    const { getByTestId, queryByTestId } = render(<SkeletonDetail sections={2} />);
    expect(getByTestId("skeleton-detail-section-0")).toBeTruthy();
    expect(getByTestId("skeleton-detail-section-1")).toBeTruthy();
    expect(queryByTestId("skeleton-detail-section-2")).toBeNull();
  });

  it("has correct accessibility attributes", () => {
    const { getByTestId } = render(<SkeletonDetail />);
    const root = getByTestId("skeleton-detail");
    expect(root.props.accessibilityLabel).toBe("Loading detail");
    expect(root.props.accessibilityRole).toBe("progressbar");
  });

  it("uses custom testID", () => {
    const { getByTestId } = render(<SkeletonDetail testID="my-detail" />);
    expect(getByTestId("my-detail")).toBeTruthy();
  });

  it("renders fields per section correctly", () => {
    const { getByTestId } = render(<SkeletonDetail sections={1} fieldsPerSection={2} />);
    const section = getByTestId("skeleton-detail-section-0");
    // Section title + 2 fields = 3 children
    expect(section.children.length).toBe(3);
  });
});
