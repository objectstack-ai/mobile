/**
 * Tests for useSharing – validates sharing info fetch,
 * share, and revoke operations.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockGet = jest.fn();
const mockShare = jest.fn();
const mockRevoke = jest.fn();

const mockClient = {
  security: {
    sharing: { get: mockGet, share: mockShare, revoke: mockRevoke },
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useSharing } from "~/hooks/useSharing";

beforeEach(() => {
  mockGet.mockReset();
  mockShare.mockReset();
  mockRevoke.mockReset();
});

describe("useSharing", () => {
  it("getSharingInfo fetches and stores info", async () => {
    const info = {
      objectName: "Account",
      recordId: "001",
      owner: "user-1",
      shares: [
        { type: "user", id: "user-2", name: "Alice", accessLevel: "read" },
      ],
    };
    mockGet.mockResolvedValue(info);

    const { result } = renderHook(() => useSharing());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.getSharingInfo("Account", "001");
    });

    expect(mockGet).toHaveBeenCalledWith({ object: "Account", recordId: "001" });
    expect(returned).toEqual(info);
    expect(result.current.sharingInfo).toEqual(info);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("share adds a recipient", async () => {
    mockShare.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSharing());

    const recipient = { type: "user" as const, id: "user-3", accessLevel: "write" as const };
    await act(async () => {
      await result.current.share("Account", "001", recipient);
    });

    expect(mockShare).toHaveBeenCalledWith({
      object: "Account",
      recordId: "001",
      recipient,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("revoke removes a recipient", async () => {
    mockRevoke.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSharing());

    await act(async () => {
      await result.current.revoke("Account", "001", "user-3");
    });

    expect(mockRevoke).toHaveBeenCalledWith({
      object: "Account",
      recordId: "001",
      recipientId: "user-3",
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles getSharingInfo error", async () => {
    mockGet.mockRejectedValue(new Error("Not found"));

    const { result } = renderHook(() => useSharing());

    await act(async () => {
      await expect(result.current.getSharingInfo("Account", "001")).rejects.toThrow("Not found");
    });

    expect(result.current.sharingInfo).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe("Not found");
  });

  it("handles share error", async () => {
    mockShare.mockRejectedValue(new Error("Share denied"));

    const { result } = renderHook(() => useSharing());

    const recipient = { type: "user" as const, id: "user-3", accessLevel: "read" as const };
    await act(async () => {
      await expect(result.current.share("Account", "001", recipient)).rejects.toThrow("Share denied");
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe("Share denied");
  });
});
