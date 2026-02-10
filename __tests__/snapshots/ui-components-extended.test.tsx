/**
 * Snapshot tests for additional UI components.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

import { Input } from "~/components/ui/Input";
import { Avatar } from "~/components/ui/Avatar";
import { Checkbox } from "~/components/ui/Checkbox";
import { Switch } from "~/components/ui/Switch";
import { Skeleton } from "~/components/ui/Skeleton";

/* ------------------------------------------------------------------ */
/*  Input                                                               */
/* ------------------------------------------------------------------ */

describe("Input snapshots", () => {
  it("renders default input", () => {
    const tree = render(<Input placeholder="Enter text" />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders with custom class", () => {
    const tree = render(
      <Input placeholder="Search" containerClassName="bg-red-50" />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });
});

describe("Input behavior", () => {
  it("calls onFocus and onBlur", () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const { getByPlaceholderText } = render(
      <Input placeholder="test" onFocus={onFocus} onBlur={onBlur} />,
    );
    const input = getByPlaceholderText("test");
    fireEvent(input, "focus");
    expect(onFocus).toHaveBeenCalled();
    fireEvent(input, "blur");
    expect(onBlur).toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/*  Avatar                                                              */
/* ------------------------------------------------------------------ */

describe("Avatar snapshots", () => {
  it("renders with fallback text", () => {
    const tree = render(<Avatar fallback="JD" />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders small size", () => {
    const tree = render(<Avatar fallback="AB" size="sm" />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders large size", () => {
    const tree = render(<Avatar fallback="XY" size="lg" />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders with image source", () => {
    const tree = render(
      <Avatar fallback="JD" src="https://example.com/avatar.jpg" />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });
});

/* ------------------------------------------------------------------ */
/*  Checkbox                                                            */
/* ------------------------------------------------------------------ */

describe("Checkbox snapshots", () => {
  it("renders unchecked", () => {
    const tree = render(
      <Checkbox checked={false} onCheckedChange={jest.fn()} />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders checked", () => {
    const tree = render(
      <Checkbox checked={true} onCheckedChange={jest.fn()} />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders disabled", () => {
    const tree = render(
      <Checkbox checked={false} onCheckedChange={jest.fn()} disabled />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });
});

describe("Checkbox behavior", () => {
  it("calls onCheckedChange when pressed", () => {
    const onCheckedChange = jest.fn();
    const { getByRole } = render(
      <Checkbox checked={false} onCheckedChange={onCheckedChange} />,
    );
    fireEvent.press(getByRole("checkbox"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Switch                                                              */
/* ------------------------------------------------------------------ */

describe("Switch snapshots", () => {
  it("renders unchecked", () => {
    const tree = render(
      <Switch checked={false} onCheckedChange={jest.fn()} />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders checked", () => {
    const tree = render(
      <Switch checked={true} onCheckedChange={jest.fn()} />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders disabled", () => {
    const tree = render(
      <Switch checked={false} onCheckedChange={jest.fn()} disabled />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });
});

describe("Switch behavior", () => {
  it("calls onCheckedChange when pressed", () => {
    const onCheckedChange = jest.fn();
    const { getByRole } = render(
      <Switch checked={false} onCheckedChange={onCheckedChange} />,
    );
    fireEvent.press(getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Skeleton                                                            */
/* ------------------------------------------------------------------ */

describe("Skeleton snapshots", () => {
  it("renders default skeleton", () => {
    const tree = render(<Skeleton />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders with custom dimensions", () => {
    const tree = render(<Skeleton width={200} height={20} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
