/**
 * Tests for useAnalyticsQuery – validates analytics data querying
 * via client.analytics.query().
 */
import { renderHook, act, waitFor } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockAnalyticsQuery = jest.fn();

const mockClient = {
  analytics: {
    query: mockAnalyticsQuery,
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useAnalyticsQuery } from "~/hooks/useAnalyticsQuery";

beforeEach(() => {
  mockAnalyticsQuery.mockReset();
});

describe("useAnalyticsQuery", () => {
  it("fetches analytics data on mount", async () => {
    mockAnalyticsQuery.mockResolvedValue({
      data: [
        { label: "Open", value: 10 },
        { label: "Closed", value: 25 },
      ],
      total: 35,
    });

    const { result } = renderHook(() =>
      useAnalyticsQuery({
        metric: "tasks",
        groupBy: "status",
        aggregate: "count",
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0]).toEqual({ label: "Open", value: 10 });
    expect(result.current.total).toBe(35);
    expect(result.current.error).toBeNull();
  });

  it("handles array response format", async () => {
    mockAnalyticsQuery.mockResolvedValue([
      { label: "Q1", value: 100 },
      { label: "Q2", value: 200 },
    ]);

    const { result } = renderHook(() =>
      useAnalyticsQuery({ metric: "revenue", aggregate: "sum", field: "amount" }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.total).toBe(300); // sum of values
  });

  it("does not fetch when enabled is false", async () => {
    const { result } = renderHook(() =>
      useAnalyticsQuery({ metric: "tasks", enabled: false }),
    );

    // Give it time to settle
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockAnalyticsQuery).not.toHaveBeenCalled();
    expect(result.current.data).toHaveLength(0);
  });

  it("handles fetch errors", async () => {
    mockAnalyticsQuery.mockRejectedValue(new Error("Analytics unavailable"));

    const { result } = renderHook(() =>
      useAnalyticsQuery({ metric: "tasks" }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("Analytics unavailable");
    expect(result.current.data).toHaveLength(0);
  });

  it("supports refetch", async () => {
    mockAnalyticsQuery
      .mockResolvedValueOnce({ data: [{ label: "A", value: 1 }], total: 1 })
      .mockResolvedValueOnce({ data: [{ label: "A", value: 2 }], total: 2 });

    const { result } = renderHook(() =>
      useAnalyticsQuery({ metric: "tasks" }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data[0].value).toBe(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data[0].value).toBe(2);
    expect(mockAnalyticsQuery).toHaveBeenCalledTimes(2);
  });

  it("passes all query parameters to SDK", async () => {
    mockAnalyticsQuery.mockResolvedValue({ data: [], total: 0 });

    const { result } = renderHook(() =>
      useAnalyticsQuery({
        metric: "tasks",
        groupBy: "status",
        aggregate: "count",
        field: "id",
        filter: { priority: "high" },
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        limit: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockAnalyticsQuery).toHaveBeenCalledWith({
      metric: "tasks",
      groupBy: "status",
      aggregate: "count",
      field: "id",
      filter: { priority: "high" },
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      limit: 10,
    });
  });
});
