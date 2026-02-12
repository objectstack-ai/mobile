/**
 * Tests for useTerritory – validates territory listing,
 * assignment, and removal operations.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockList = jest.fn();
const mockGetAssignments = jest.fn();
const mockAssign = jest.fn();
const mockRemove = jest.fn();

const mockClient = {
  security: {
    territories: {
      list: mockList,
      getAssignments: mockGetAssignments,
      assign: mockAssign,
      remove: mockRemove,
    },
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useTerritory } from "~/hooks/useTerritory";

beforeEach(() => {
  mockList.mockReset();
  mockGetAssignments.mockReset();
  mockAssign.mockReset();
  mockRemove.mockReset();
});

describe("useTerritory", () => {
  it("getTerritories fetches and stores list", async () => {
    const territories = [
      { id: "t-1", name: "West", type: "region", description: "West region" },
      { id: "t-2", name: "East", parentId: "t-1", type: "region" },
    ];
    mockList.mockResolvedValue(territories);

    const { result } = renderHook(() => useTerritory());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.getTerritories();
    });

    expect(mockList).toHaveBeenCalled();
    expect(returned).toEqual(territories);
    expect(result.current.territories).toEqual(territories);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("getRecordTerritories returns assignments", async () => {
    const assignments = [
      { recordId: "001", territoryId: "t-1", assignedAt: "2026-01-01T00:00:00Z" },
    ];
    mockGetAssignments.mockResolvedValue(assignments);

    const { result } = renderHook(() => useTerritory());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.getRecordTerritories("Account", "001");
    });

    expect(mockGetAssignments).toHaveBeenCalledWith({
      object: "Account",
      recordId: "001",
    });
    expect(returned).toEqual(assignments);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("assignTerritory calls assign", async () => {
    mockAssign.mockResolvedValue(undefined);

    const { result } = renderHook(() => useTerritory());

    await act(async () => {
      await result.current.assignTerritory("Account", "001", "t-1");
    });

    expect(mockAssign).toHaveBeenCalledWith({
      object: "Account",
      recordId: "001",
      territoryId: "t-1",
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("removeTerritory calls remove", async () => {
    mockRemove.mockResolvedValue(undefined);

    const { result } = renderHook(() => useTerritory());

    await act(async () => {
      await result.current.removeTerritory("Account", "001", "t-1");
    });

    expect(mockRemove).toHaveBeenCalledWith({
      object: "Account",
      recordId: "001",
      territoryId: "t-1",
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles getTerritories error", async () => {
    mockList.mockRejectedValue(new Error("Service unavailable"));

    const { result } = renderHook(() => useTerritory());

    await act(async () => {
      await expect(result.current.getTerritories()).rejects.toThrow("Service unavailable");
    });

    expect(result.current.territories).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe("Service unavailable");
  });

  it("handles assign error", async () => {
    mockAssign.mockRejectedValue(new Error("Assignment failed"));

    const { result } = renderHook(() => useTerritory());

    await act(async () => {
      await expect(
        result.current.assignTerritory("Account", "001", "t-1"),
      ).rejects.toThrow("Assignment failed");
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe("Assignment failed");
  });
});
