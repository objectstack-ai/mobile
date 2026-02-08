/**
 * Snapshot tests for common components.
 */
import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";

import { SearchBar } from "~/components/common/SearchBar";
import { LoadingScreen } from "~/components/common/LoadingScreen";
import { EmptyState } from "~/components/common/EmptyState";
import { CachedImage } from "~/components/common/CachedImage";

/* ------------------------------------------------------------------ */
/*  SearchBar                                                           */
/* ------------------------------------------------------------------ */

describe("SearchBar snapshots", () => {
  it("renders with default placeholder", () => {
    const tree = render(
      <SearchBar value="" onChangeText={jest.fn()} />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders with custom placeholder", () => {
    const tree = render(
      <SearchBar
        value=""
        onChangeText={jest.fn()}
        placeholder="Find records…"
      />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders with value", () => {
    const tree = render(
      <SearchBar value="test query" onChangeText={jest.fn()} />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });
});

describe("SearchBar behavior", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("debounces onChangeText", () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={onChangeText} debounceMs={300} />,
    );
    const input = getByPlaceholderText("Search…");

    fireEvent.changeText(input, "hello");
    expect(onChangeText).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(onChangeText).toHaveBeenCalledWith("hello");
  });
});

/* ------------------------------------------------------------------ */
/*  LoadingScreen                                                       */
/* ------------------------------------------------------------------ */

describe("LoadingScreen snapshots", () => {
  it("renders without message", () => {
    const tree = render(<LoadingScreen />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders with message", () => {
    const tree = render(<LoadingScreen message="Loading data…" />);
    expect(tree.toJSON()).toMatchSnapshot();
  });
});

/* ------------------------------------------------------------------ */
/*  CachedImage                                                         */
/* ------------------------------------------------------------------ */

describe("CachedImage snapshots", () => {
  it("renders with URI", () => {
    const tree = render(
      <CachedImage uri="https://example.com/image.jpg" />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders with dimensions", () => {
    const tree = render(
      <CachedImage
        uri="https://example.com/image.jpg"
        width={200}
        height={150}
      />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders with blurhash", () => {
    const tree = render(
      <CachedImage
        uri="https://example.com/image.jpg"
        blurhash="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
      />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
