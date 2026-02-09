/**
 * Tests for useViewStorage (refactored) – validates the typed
 * SDK views API integration with list/form view configs.
 */
import { renderHook, act, waitFor } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockViewsList = jest.fn();
const mockViewsCreate = jest.fn();
const mockViewsUpdate = jest.fn();
const mockViewsDelete = jest.fn();

const mockClient = {
  views: {
    list: mockViewsList,
    create: mockViewsCreate,
    update: mockViewsUpdate,
    delete: mockViewsDelete,
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useViewStorage } from "~/hooks/useViewStorage";

beforeEach(() => {
  mockViewsList.mockReset();
  mockViewsCreate.mockReset();
  mockViewsUpdate.mockReset();
  mockViewsDelete.mockReset();
});

describe("useViewStorage (refactored)", () => {
  it("fetches views on mount using typed API", async () => {
    mockViewsList.mockResolvedValue({
      object: "tasks",
      views: [
        {
          id: "v1",
          name: "My Tasks",
          visibility: "private",
          list: { columns: ["name", "status"], filter: { status: "open" } },
        },
        {
          id: "v2",
          name: "Team View",
          visibility: "shared",
          form: { sections: [{ label: "Main", fields: ["name"] }] },
        },
      ],
    });

    const { result } = renderHook(() => useViewStorage("tasks"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.views).toHaveLength(2);
    expect(result.current.views[0]).toEqual({
      id: "v1",
      name: "My Tasks",
      objectName: "tasks",
      viewType: "list",
      list: { columns: ["name", "status"], filter: { status: "open" } },
      form: undefined,
      visibility: "private",
      createdBy: undefined,
      updatedAt: undefined,
    });
    expect(result.current.views[1].viewType).toBe("form");
    expect(result.current.error).toBeNull();
  });

  it("handles empty views list", async () => {
    mockViewsList.mockResolvedValue({ object: "tasks", views: [] });

    const { result } = renderHook(() => useViewStorage("tasks"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.views).toHaveLength(0);
  });

  it("creates a view with list config", async () => {
    mockViewsList.mockResolvedValue({ object: "tasks", views: [] });
    mockViewsCreate.mockResolvedValue({
      object: "tasks",
      viewId: "v-new",
    });

    const { result } = renderHook(() => useViewStorage("tasks"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.saveView({
        name: "Open Tasks",
        visibility: "private",
        list: { columns: ["name", "priority"] },
      });
    });

    expect(mockViewsCreate).toHaveBeenCalledWith("tasks", {
      name: "Open Tasks",
      visibility: "private",
      list: { columns: ["name", "priority"] },
    });
  });

  it("creates a view with legacy flat filters", async () => {
    mockViewsList.mockResolvedValue({ object: "tasks", views: [] });
    mockViewsCreate.mockResolvedValue({
      object: "tasks",
      viewId: "v-new",
    });

    const { result } = renderHook(() => useViewStorage("tasks"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.saveView({
        name: "Filtered",
        visibility: "shared",
        filters: { status: "active" },
        sort: ["-created_at"],
        columns: ["name", "status"],
      });
    });

    // Legacy flat fields should be wrapped into list config
    expect(mockViewsCreate).toHaveBeenCalledWith("tasks", {
      name: "Filtered",
      visibility: "shared",
      list: {
        filter: { status: "active" },
        sort: ["-created_at"],
        columns: ["name", "status"],
      },
    });
  });

  it("updates a view", async () => {
    mockViewsList.mockResolvedValue({ object: "tasks", views: [] });
    mockViewsUpdate.mockResolvedValue({
      object: "tasks",
      viewId: "v1",
    });

    const { result } = renderHook(() => useViewStorage("tasks"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateView("v1", {
        name: "Renamed View",
      });
    });

    expect(mockViewsUpdate).toHaveBeenCalledWith("tasks", "v1", {
      name: "Renamed View",
    });
  });

  it("deletes a view and clears activeViewId", async () => {
    mockViewsList.mockResolvedValue({
      object: "tasks",
      views: [{ id: "v1", name: "Test" }],
    });
    mockViewsDelete.mockResolvedValue({
      object: "tasks",
      viewId: "v1",
      success: true,
    });

    const { result } = renderHook(() => useViewStorage("tasks"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Set active view
    act(() => {
      result.current.setActiveViewId("v1");
    });
    expect(result.current.activeViewId).toBe("v1");

    // Delete the active view
    await act(async () => {
      await result.current.deleteView("v1");
    });

    expect(mockViewsDelete).toHaveBeenCalledWith("tasks", "v1");
    expect(result.current.activeViewId).toBeNull();
  });

  it("handles fetch error gracefully", async () => {
    mockViewsList.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useViewStorage("tasks"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("Network error");
    expect(result.current.views).toHaveLength(0);
  });
});
