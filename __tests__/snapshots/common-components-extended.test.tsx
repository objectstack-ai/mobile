/**
 * Snapshot and behavior tests for more common components.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Text, View } from "react-native";

import { OfflineIndicator } from "~/components/common/OfflineIndicator";
import { ErrorBoundary } from "~/components/common/ErrorBoundary";
import { PullToRefresh } from "~/components/common/PullToRefresh";
import { InfiniteScrollList } from "~/components/common/InfiniteScrollList";

/* ------------------------------------------------------------------ */
/*  OfflineIndicator                                                    */
/* ------------------------------------------------------------------ */

describe("OfflineIndicator snapshots", () => {
  it("renders nothing when online with no pending changes", () => {
    const tree = render(<OfflineIndicator isOffline={false} />);
    expect(tree.toJSON()).toBeNull();
  });

  it("renders offline banner", () => {
    const tree = render(<OfflineIndicator isOffline={true} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders offline with pending count", () => {
    const tree = render(
      <OfflineIndicator isOffline={true} pendingCount={3} />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders syncing state when online with pending", () => {
    const tree = render(
      <OfflineIndicator
        isOffline={false}
        pendingCount={2}
        onSyncPress={jest.fn()}
      />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders syncing in progress", () => {
    const tree = render(
      <OfflineIndicator
        isOffline={false}
        pendingCount={1}
        isSyncing={true}
        onSyncPress={jest.fn()}
      />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });
});

/* ------------------------------------------------------------------ */
/*  ErrorBoundary                                                       */
/* ------------------------------------------------------------------ */

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test error");
  return <Text>Normal content</Text>;
}

describe("ErrorBoundary", () => {
  // Suppress console.error from React during error boundary tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it("renders children when no error", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(getByText("Normal content")).toBeTruthy();
  });

  it("renders error state when child throws", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(getByText("Something went wrong")).toBeTruthy();
    expect(getByText("Test error")).toBeTruthy();
  });

  it("renders retry button", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(getByText("Try Again")).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/*  PullToRefresh                                                       */
/* ------------------------------------------------------------------ */

describe("PullToRefresh", () => {
  it("renders children", () => {
    const { getByText } = render(
      <PullToRefresh onRefresh={async () => {}}>
        <Text>Content</Text>
      </PullToRefresh>,
    );
    expect(getByText("Content")).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/*  InfiniteScrollList                                                  */
/* ------------------------------------------------------------------ */

describe("InfiniteScrollList", () => {
  it("renders data items", () => {
    const data = [
      { id: "1", name: "A" },
      { id: "2", name: "B" },
    ];
    const { getAllByText } = render(
      <InfiniteScrollList
        data={data}
        renderItem={({ item }) => <Text>{(item as any).name}</Text>}
        onEndReached={jest.fn()}
        isLoading={false}
        hasMore={false}
        keyExtractor={(item) => (item as any).id}
      />,
    );
    expect(getAllByText(/[AB]/)).toHaveLength(2);
  });

  it("renders empty component when no data", () => {
    const { getByText } = render(
      <InfiniteScrollList
        data={[]}
        renderItem={() => null}
        onEndReached={jest.fn()}
        isLoading={false}
        hasMore={false}
        ListEmptyComponent={<Text>No items</Text>}
      />,
    );
    expect(getByText("No items")).toBeTruthy();
  });

  it("renders with data and loading state", () => {
    const { UNSAFE_queryAllByType } = render(
      <InfiniteScrollList
        data={[{ id: "1" }]}
        renderItem={() => <View />}
        onEndReached={jest.fn()}
        isLoading={true}
        hasMore={true}
        keyExtractor={(item) => (item as any).id}
      />,
    );
    // Just verify it renders without error
    expect(UNSAFE_queryAllByType).toBeDefined();
  });
});
