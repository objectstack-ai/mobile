import React from "react";
import { render } from "@testing-library/react-native";

import { SkeletonList } from "~/components/common/SkeletonList";

describe("SkeletonList", () => {
  it("renders with default props", () => {
    const { getByTestId } = render(<SkeletonList />);
    expect(getByTestId("skeleton-list")).toBeTruthy();
  });

  it("renders the correct number of rows", () => {
    const { toJSON } = render(<SkeletonList rows={3} />);
    const tree = toJSON();
    // Root has 3 row children
    expect(tree.children).toHaveLength(3);
  });

  it("hides avatars when showAvatar is false", () => {
    const { toJSON: withAvatar } = render(<SkeletonList rows={1} showAvatar={true} />);
    const { toJSON: withoutAvatar } = render(<SkeletonList rows={1} showAvatar={false} />);
    const withAvatarTree = withAvatar();
    const withoutAvatarTree = withoutAvatar();
    // Row with avatar has more children than without
    expect(withAvatarTree.children[0].children.length).toBeGreaterThan(
      withoutAvatarTree.children[0].children.length
    );
  });

  it("has correct accessibility attributes", () => {
    const { getByTestId } = render(<SkeletonList />);
    const root = getByTestId("skeleton-list");
    expect(root.props.accessibilityLabel).toBe("Loading list");
    expect(root.props.accessibilityRole).toBe("progressbar");
  });

  it("uses custom testID", () => {
    const { getByTestId } = render(<SkeletonList testID="custom-skeleton" />);
    expect(getByTestId("custom-skeleton")).toBeTruthy();
  });
});
