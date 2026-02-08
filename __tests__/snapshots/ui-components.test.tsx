/**
 * Snapshot tests for core UI components.
 *
 * These snapshots capture the rendered component tree so that
 * unintentional UI regressions are caught during code review.
 */
import React from "react";
import { render } from "@testing-library/react-native";
import { Text, View } from "react-native";

import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "~/components/ui/Card";
import { EmptyState } from "~/components/common/EmptyState";

/* ------------------------------------------------------------------ */
/*  Button snapshots                                                    */
/* ------------------------------------------------------------------ */

describe("Button snapshots", () => {
  it("renders default variant", () => {
    const tree = render(<Button>Click me</Button>);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders destructive variant", () => {
    const tree = render(<Button variant="destructive">Delete</Button>);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders outline variant", () => {
    const tree = render(<Button variant="outline">Cancel</Button>);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders ghost variant", () => {
    const tree = render(<Button variant="ghost">More</Button>);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders small size", () => {
    const tree = render(<Button size="sm">Small</Button>);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders large size", () => {
    const tree = render(<Button size="lg">Large</Button>);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders disabled state", () => {
    const tree = render(<Button disabled>Disabled</Button>);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders with custom children", () => {
    const tree = render(
      <Button>
        <View>
          <Text>Custom</Text>
        </View>
      </Button>,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });
});

/* ------------------------------------------------------------------ */
/*  Badge snapshots                                                     */
/* ------------------------------------------------------------------ */

describe("Badge snapshots", () => {
  it("renders default variant", () => {
    const tree = render(<Badge>New</Badge>);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders secondary variant", () => {
    const tree = render(<Badge variant="secondary">Draft</Badge>);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders destructive variant", () => {
    const tree = render(<Badge variant="destructive">Error</Badge>);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders outline variant", () => {
    const tree = render(<Badge variant="outline">Tag</Badge>);
    expect(tree.toJSON()).toMatchSnapshot();
  });
});

/* ------------------------------------------------------------------ */
/*  Card snapshots                                                      */
/* ------------------------------------------------------------------ */

describe("Card snapshots", () => {
  it("renders a full card", () => {
    const tree = render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description text</CardDescription>
        </CardHeader>
        <CardContent>
          <Text>Body content</Text>
        </CardContent>
        <CardFooter>
          <Text>Footer</Text>
        </CardFooter>
      </Card>,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders a minimal card", () => {
    const tree = render(
      <Card>
        <Text>Simple card</Text>
      </Card>,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });
});

/* ------------------------------------------------------------------ */
/*  EmptyState snapshots                                                */
/* ------------------------------------------------------------------ */

describe("EmptyState snapshots", () => {
  it("renders with title only", () => {
    const tree = render(<EmptyState title="No Data" />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders with title and description", () => {
    const tree = render(
      <EmptyState title="No Records" description="Create your first record." />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders with action button", () => {
    const tree = render(
      <EmptyState
        title="Empty"
        description="Nothing here yet."
        action={<Button>Create</Button>}
      />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders with icon", () => {
    const tree = render(
      <EmptyState
        title="Search"
        icon={<View testID="icon" />}
      />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
