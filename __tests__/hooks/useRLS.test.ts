/**
 * Tests for useRLS – validates RLS policy fetching
 * and access evaluation.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockList = jest.fn();
const mockEvaluate = jest.fn();

const mockClient = {
  security: {
    rls: { list: mockList, evaluate: mockEvaluate },
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useRLS } from "~/hooks/useRLS";

beforeEach(() => {
  mockList.mockReset();
  mockEvaluate.mockReset();
});

describe("useRLS", () => {
  it("getPolicies fetches and stores policies", async () => {
    const policies = [
      {
        id: "pol-1",
        object: "Account",
        name: "Account Select",
        operation: "select",
        condition: "owner_id = current_user()",
        enabled: true,
      },
      {
        id: "pol-2",
        object: "Account",
        name: "Account Update",
        operation: "update",
        condition: "owner_id = current_user()",
        enabled: false,
      },
    ];
    mockList.mockResolvedValue(policies);

    const { result } = renderHook(() => useRLS());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.getPolicies("Account");
    });

    expect(mockList).toHaveBeenCalledWith({ object: "Account" });
    expect(returned).toEqual(policies);
    expect(result.current.policies).toEqual(policies);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("evaluate checks access for record", async () => {
    const evaluation = {
      allowed: true,
      appliedPolicies: ["pol-1"],
    };
    mockEvaluate.mockResolvedValue(evaluation);

    const { result } = renderHook(() => useRLS());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.evaluate("Account", "001", "select");
    });

    expect(mockEvaluate).toHaveBeenCalledWith({
      object: "Account",
      recordId: "001",
      operation: "select",
    });
    expect(returned).toEqual(evaluation);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles getPolicies error", async () => {
    mockList.mockRejectedValue(new Error("Forbidden"));

    const { result } = renderHook(() => useRLS());

    await act(async () => {
      await expect(result.current.getPolicies("Account")).rejects.toThrow("Forbidden");
    });

    expect(result.current.policies).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe("Forbidden");
  });

  it("handles evaluate error", async () => {
    mockEvaluate.mockRejectedValue(new Error("Evaluation failed"));

    const { result } = renderHook(() => useRLS());

    await act(async () => {
      await expect(result.current.evaluate("Account", "001")).rejects.toThrow("Evaluation failed");
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe("Evaluation failed");
  });
});
