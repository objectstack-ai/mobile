/**
 * Tests for useFlows — validates flow metadata fetch + normalization
 * (label fallback, node/edge/variable mapping) and the error path.
 */
import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/* ---- Mock the authenticated fetch from lib/objectstack ---- */
const mockApiFetch = jest.fn();
jest.mock("~/lib/objectstack", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { useFlows, useFlow } from "~/hooks/useFlows";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response;
}

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe("useFlows", () => {
  it("fetches and normalizes flow definitions", async () => {
    mockApiFetch.mockResolvedValue(
      jsonResponse({
        type: "flow",
        items: [
          {
            name: "lead_conversion",
            label: "Lead Conversion Process",
            description: "Convert leads",
            version: 1,
            status: "draft",
            type: "screen",
            variables: [{ name: "leadId", type: "text", isInput: true }],
            nodes: [
              { id: "start", type: "start", label: "Start" },
              { id: "create", type: "create_record", label: "Create Account" },
            ],
            edges: [{ id: "e1", source: "start", target: "create" }],
          },
          // Missing label → falls back to name; missing arrays → empty.
          { name: "bare_flow" },
          // No name → filtered out.
          { label: "ghost" },
        ],
      }),
    );

    const { result } = renderHook(() => useFlows(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/meta/flow");
    const flows = result.current.data!;
    expect(flows).toHaveLength(2);

    const lead = flows[0];
    expect(lead.label).toBe("Lead Conversion Process");
    expect(lead.nodes).toHaveLength(2);
    expect(lead.edges[0]).toMatchObject({ source: "start", target: "create" });
    expect(lead.variables[0]).toMatchObject({ name: "leadId", isInput: true });

    const bare = flows[1];
    expect(bare.label).toBe("bare_flow"); // label fallback
    expect(bare.nodes).toEqual([]);
    expect(bare.edges).toEqual([]);
  });

  it("surfaces an error when the request fails", async () => {
    mockApiFetch.mockResolvedValue(jsonResponse(null, false, 500));

    const { result } = renderHook(() => useFlows(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/HTTP 500/);
  });
});

describe("useFlow", () => {
  it("selects a single flow by name from the cached list", async () => {
    mockApiFetch.mockResolvedValue(
      jsonResponse({
        items: [
          { name: "a", label: "Alpha", nodes: [], edges: [] },
          { name: "b", label: "Beta", nodes: [], edges: [] },
        ],
      }),
    );

    const { result } = renderHook(() => useFlow("b"), { wrapper });
    await waitFor(() => expect(result.current.flow).toBeDefined());
    expect(result.current.flow?.label).toBe("Beta");
  });
});
