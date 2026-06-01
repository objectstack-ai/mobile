/**
 * Tests for useFlowRuns / useTriggerFlow — validates run-history fetch and,
 * critically, that a 200 response carrying an inner { success: false } envelope
 * is surfaced as a failure (not a false success).
 */
import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/* ---- Mock the SDK client ---- */
const mockListRuns = jest.fn();
const mockExecute = jest.fn();
const mockClient = {
  automation: { listRuns: mockListRuns, execute: mockExecute, getRun: jest.fn() },
};
jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useFlowRuns, useTriggerFlow } from "~/hooks/useFlowRuns";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockListRuns.mockReset();
  mockExecute.mockReset();
});

describe("useFlowRuns", () => {
  it("returns the run list + hasMore", async () => {
    mockListRuns.mockResolvedValue({
      runs: [{ id: "r1", flowName: "f", status: "success" }],
      hasMore: true,
    });
    const { result } = renderHook(() => useFlowRuns("f"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListRuns).toHaveBeenCalledWith("f", { limit: 25 });
    expect(result.current.data).toEqual({
      runs: [{ id: "r1", flowName: "f", status: "success" }],
      hasMore: true,
    });
  });

  it("defaults to an empty list when the response is empty", async () => {
    mockListRuns.mockResolvedValue(undefined);
    const { result } = renderHook(() => useFlowRuns("f"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ runs: [], hasMore: false });
  });
});

describe("useTriggerFlow", () => {
  it("reports ok on a successful run", async () => {
    mockExecute.mockResolvedValue({ runId: "r9", status: "success" });
    const { result } = renderHook(() => useTriggerFlow(), { wrapper });
    let res: { ok: boolean; error?: string } = { ok: false };
    await act(async () => {
      res = await result.current.trigger("f");
    });
    expect(res.ok).toBe(true);
  });

  it("surfaces an inner { success: false } envelope as a failure", async () => {
    // HTTP 200 but the engine couldn't run the flow.
    mockExecute.mockResolvedValue({ success: false, error: "Flow 'f' not found" });
    const { result } = renderHook(() => useTriggerFlow(), { wrapper });
    let res: { ok: boolean; error?: string } = { ok: true };
    await act(async () => {
      res = await result.current.trigger("f");
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("Flow 'f' not found");
  });

  it("reports the error message when the request throws", async () => {
    mockExecute.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useTriggerFlow(), { wrapper });
    let res: { ok: boolean; error?: string } = { ok: true };
    await act(async () => {
      res = await result.current.trigger("f");
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("network down");
  });
});
