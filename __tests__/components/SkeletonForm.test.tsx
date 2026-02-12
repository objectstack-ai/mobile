import React from "react";
import { render } from "@testing-library/react-native";

import { SkeletonForm } from "~/components/common/SkeletonForm";

describe("SkeletonForm", () => {
  it("renders with default props", () => {
    const { getByTestId } = render(<SkeletonForm />);
    expect(getByTestId("skeleton-form")).toBeTruthy();
  });

  it("renders the correct number of fields", () => {
    const { getByTestId, queryByTestId } = render(<SkeletonForm fields={3} />);
    expect(getByTestId("skeleton-form-field-0")).toBeTruthy();
    expect(getByTestId("skeleton-form-field-1")).toBeTruthy();
    expect(getByTestId("skeleton-form-field-2")).toBeTruthy();
    expect(queryByTestId("skeleton-form-field-3")).toBeNull();
  });

  it("has correct accessibility attributes", () => {
    const { getByTestId } = render(<SkeletonForm />);
    const root = getByTestId("skeleton-form");
    expect(root.props.accessibilityLabel).toBe("Loading form");
    expect(root.props.accessibilityRole).toBe("progressbar");
  });

  it("uses custom testID", () => {
    const { getByTestId } = render(<SkeletonForm testID="my-form" />);
    expect(getByTestId("my-form")).toBeTruthy();
  });

  it("each field has label and input skeletons", () => {
    const { getByTestId } = render(<SkeletonForm fields={1} />);
    const field = getByTestId("skeleton-form-field-0");
    // Label + input = 2 children
    expect(field.children.length).toBe(2);
  });
});
