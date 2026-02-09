/**
 * Tests for useAnalyticsMeta – validates analytics metadata fetching
 * via client.analytics.meta().
 */
import { renderHook, act, waitFor } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockAnalyticsMeta = jest.fn();

const mockClient = {
  analytics: {
    meta: mockAnalyticsMeta,
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useAnalyticsMeta } from "~/hooks/useAnalyticsMeta";

beforeEach(() => {
  mockAnalyticsMeta.mockReset();
});

describe("useAnalyticsMeta", () => {
  it("fetches analytics metadata on mount", async () => {
    mockAnalyticsMeta.mockResolvedValue({
      metrics: [
        { name: "tasks", label: "Tasks", type: "object", fields: ["status", "priority"], aggregates: ["count", "sum"] },
        { name: "orders", label: "Orders", type: "object" },
      ],
    });

    const { result } = renderHook(() => useAnalyticsMeta());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.metrics).toHaveLength(2);
    expect(result.current.metrics[0]).toEqual({
      name: "tasks",
      label: "Tasks",
      type: "object",
      fields: ["status", "priority"],
      aggregates: ["count", "sum"],
    });
    expect(result.current.error).toBeNull();
  });

  it("handles array response format", async () => {
    mockAnalyticsMeta.mockResolvedValue([
      { name: "users", label: "Users" },
    ]);

    const { result } = renderHook(() => useAnalyticsMeta());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.metrics).toHaveLength(1);
    expect(result.current.metrics[0].name).toBe("users");
  });

  it("handles fetch error", async () => {
    mockAnalyticsMeta.mockRejectedValue(new Error("Meta service down"));

    const { result } = renderHook(() => useAnalyticsMeta());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("Meta service down");
    expect(result.current.metrics).toHaveLength(0);
  });

  it("supports refetch", async () => {
    mockAnalyticsMeta
      .mockResolvedValueOnce({ metrics: [{ name: "a", label: "A" }] })
      .mockResolvedValueOnce({ metrics: [{ name: "a", label: "A" }, { name: "b", label: "B" }] });

    const { result } = renderHook(() => useAnalyticsMeta());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.metrics).toHaveLength(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.metrics).toHaveLength(2);
  });
});
