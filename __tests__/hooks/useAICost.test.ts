/**
 * Tests for useAICost – validates AI cost analytics
 * and budget management operations.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockSummary = jest.fn();
const mockHistory = jest.fn();
const mockSetBudget = jest.fn();

const mockClient = {
  ai: { cost: { summary: mockSummary, history: mockHistory, setBudget: mockSetBudget } },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useAICost } from "~/hooks/useAICost";

beforeEach(() => {
  mockSummary.mockReset();
  mockHistory.mockReset();
  mockSetBudget.mockReset();
});

describe("useAICost", () => {
  it("fetches cost summary and stores it", async () => {
    const summaryData = {
      totalCost: 42.5,
      totalTokens: 100000,
      byModel: { "gpt-4": 30.0, "gpt-3.5": 12.5 },
      period: "monthly",
    };
    mockSummary.mockResolvedValue(summaryData);

    const { result } = renderHook(() => useAICost());

    let fetched: unknown;
    await act(async () => {
      fetched = await result.current.getCostSummary();
    });

    expect(mockSummary).toHaveBeenCalledWith({});
    expect(fetched).toEqual(summaryData);
    expect(result.current.summary).toEqual(summaryData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("fetches cost summary with period", async () => {
    const summaryData = {
      totalCost: 10.0,
      totalTokens: 25000,
      byModel: { "gpt-4": 10.0 },
      period: "weekly",
    };
    mockSummary.mockResolvedValue(summaryData);

    const { result } = renderHook(() => useAICost());

    await act(async () => {
      await result.current.getCostSummary("weekly");
    });

    expect(mockSummary).toHaveBeenCalledWith({ period: "weekly" });
    expect(result.current.summary).toEqual(summaryData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("fetches cost history", async () => {
    const historyData = [
      { model: "gpt-4", operation: "chat", inputTokens: 500, outputTokens: 200, cost: 0.05, timestamp: "2024-01-01T00:00:00Z" },
      { model: "gpt-3.5", operation: "embed", inputTokens: 1000, outputTokens: 0, cost: 0.01, timestamp: "2024-01-01T01:00:00Z" },
    ];
    mockHistory.mockResolvedValue(historyData);

    const { result } = renderHook(() => useAICost());

    let fetched: unknown;
    await act(async () => {
      fetched = await result.current.getCostHistory({ limit: 10, model: "gpt-4" });
    });

    expect(mockHistory).toHaveBeenCalledWith({ limit: 10, model: "gpt-4" });
    expect(fetched).toEqual(historyData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets budget limit and updates summary", async () => {
    const summaryData = {
      totalCost: 42.5,
      totalTokens: 100000,
      byModel: { "gpt-4": 30.0 },
      period: "monthly",
    };
    mockSummary.mockResolvedValue(summaryData);
    mockSetBudget.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAICost());

    // First fetch summary so there's state to update
    await act(async () => {
      await result.current.getCostSummary();
    });

    await act(async () => {
      await result.current.setBudgetLimit(100, "monthly");
    });

    expect(mockSetBudget).toHaveBeenCalledWith({ limit: 100, period: "monthly" });
    expect(result.current.summary?.budgetLimit).toBe(100);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles summary error", async () => {
    mockSummary.mockRejectedValue(new Error("Failed to fetch cost summary"));

    const { result } = renderHook(() => useAICost());

    await act(async () => {
      await expect(
        result.current.getCostSummary(),
      ).rejects.toThrow("Failed to fetch cost summary");
    });

    expect(result.current.error?.message).toBe("Failed to fetch cost summary");
  });

  it("handles setBudget error", async () => {
    mockSetBudget.mockRejectedValue(new Error("Failed to set budget limit"));

    const { result } = renderHook(() => useAICost());

    await act(async () => {
      await expect(
        result.current.setBudgetLimit(100),
      ).rejects.toThrow("Failed to set budget limit");
    });

    expect(result.current.error?.message).toBe("Failed to set budget limit");
  });
});
