/**
 * Tests for useSecurityPolicies – validates policy fetching
 * and single-policy lookup.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockList = jest.fn();
const mockGet = jest.fn();

const mockClient = {
  security: {
    policies: { list: mockList, get: mockGet },
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useSecurityPolicies } from "~/hooks/useSecurityPolicies";

beforeEach(() => {
  mockList.mockReset();
  mockGet.mockReset();
});

describe("useSecurityPolicies", () => {
  it("getPolicies fetches and stores policies", async () => {
    const policies = [
      { type: "password", name: "Password Policy", enabled: true, config: { minLength: 8 } },
      { type: "session", name: "Session Policy", enabled: true, config: { timeout: 3600 } },
    ];
    mockList.mockResolvedValue(policies);

    const { result } = renderHook(() => useSecurityPolicies());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.getPolicies();
    });

    expect(mockList).toHaveBeenCalled();
    expect(returned).toEqual(policies);
    expect(result.current.policies).toEqual(policies);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("getPolicy returns single policy", async () => {
    const policy = {
      type: "password",
      name: "Password Policy",
      enabled: true,
      config: { minLength: 8 },
    };
    mockGet.mockResolvedValue(policy);

    const { result } = renderHook(() => useSecurityPolicies());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.getPolicy("password");
    });

    expect(mockGet).toHaveBeenCalledWith({ type: "password" });
    expect(returned).toEqual(policy);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("getPolicy returns null when not found", async () => {
    mockGet.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSecurityPolicies());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.getPolicy("network");
    });

    expect(mockGet).toHaveBeenCalledWith({ type: "network" });
    expect(returned).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles getPolicies error", async () => {
    mockList.mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useSecurityPolicies());

    await act(async () => {
      await expect(result.current.getPolicies()).rejects.toThrow("Unauthorized");
    });

    expect(result.current.policies).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe("Unauthorized");
  });
});
