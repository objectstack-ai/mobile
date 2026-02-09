/**
 * Tests for usePermissions – validates permission fetching
 * and the checkPermission helper.
 */
import { renderHook, act, waitFor } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockGetObjectPermissions = jest.fn();
const mockCheck = jest.fn();

const mockClient = {
  permissions: {
    getObjectPermissions: mockGetObjectPermissions,
    check: mockCheck,
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { usePermissions } from "~/hooks/usePermissions";

beforeEach(() => {
  mockGetObjectPermissions.mockReset();
  mockCheck.mockReset();
});

describe("usePermissions", () => {
  it("fetches object permissions on mount", async () => {
    mockGetObjectPermissions.mockResolvedValue({
      object: "tasks",
      permissions: {
        allowCreate: true,
        allowRead: true,
        allowEdit: true,
        allowDelete: false,
        allowTransfer: false,
        allowRestore: false,
        allowPurge: false,
        viewAllRecords: true,
        modifyAllRecords: false,
      },
      fieldPermissions: {
        name: { readable: true, editable: true },
        status: { readable: true, editable: false },
      },
    });

    const { result } = renderHook(() => usePermissions("tasks"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.permissions).toEqual({
      allowCreate: true,
      allowRead: true,
      allowEdit: true,
      allowDelete: false,
      allowTransfer: false,
      allowRestore: false,
      allowPurge: false,
      viewAllRecords: true,
      modifyAllRecords: false,
    });
    expect(result.current.fieldPermissions).toEqual({
      name: { readable: true, editable: true },
      status: { readable: true, editable: false },
    });
    expect(result.current.error).toBeNull();
  });

  it("handles error when fetching permissions", async () => {
    mockGetObjectPermissions.mockRejectedValue(new Error("Forbidden"));

    const { result } = renderHook(() => usePermissions("tasks"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.permissions).toBeNull();
    expect(result.current.error?.message).toBe("Forbidden");
  });

  it("checkPermission calls client.permissions.check", async () => {
    mockGetObjectPermissions.mockResolvedValue({
      object: "tasks",
      permissions: {
        allowCreate: true,
        allowRead: true,
        allowEdit: true,
        allowDelete: true,
        allowTransfer: false,
        allowRestore: false,
        allowPurge: false,
        viewAllRecords: true,
        modifyAllRecords: false,
      },
    });
    mockCheck.mockResolvedValue({ allowed: true });

    const { result } = renderHook(() => usePermissions("tasks"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let allowed: boolean;
    await act(async () => {
      allowed = await result.current.checkPermission("edit", "rec-1");
    });

    expect(mockCheck).toHaveBeenCalledWith({
      object: "tasks",
      action: "edit",
      recordId: "rec-1",
      field: undefined,
    });
    expect(allowed!).toBe(true);
  });

  it("checkPermission returns false on error", async () => {
    mockGetObjectPermissions.mockResolvedValue({
      object: "tasks",
      permissions: {
        allowCreate: true,
        allowRead: true,
        allowEdit: true,
        allowDelete: true,
        allowTransfer: false,
        allowRestore: false,
        allowPurge: false,
        viewAllRecords: true,
        modifyAllRecords: false,
      },
    });
    mockCheck.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => usePermissions("tasks"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let allowed: boolean;
    await act(async () => {
      allowed = await result.current.checkPermission("delete");
    });

    expect(allowed!).toBe(false);
  });
});
