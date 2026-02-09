/**
 * Tests for useNotifications – validates notification listing,
 * read/unread management, and device registration.
 */
import { renderHook, act, waitFor } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockList = jest.fn();
const mockMarkRead = jest.fn();
const mockMarkAllRead = jest.fn();
const mockRegisterDevice = jest.fn();
const mockGetPreferences = jest.fn();
const mockUpdatePreferences = jest.fn();

const mockClient = {
  notifications: {
    list: mockList,
    markRead: mockMarkRead,
    markAllRead: mockMarkAllRead,
    registerDevice: mockRegisterDevice,
    getPreferences: mockGetPreferences,
    updatePreferences: mockUpdatePreferences,
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useNotifications } from "~/hooks/useNotifications";

beforeEach(() => {
  mockList.mockReset();
  mockMarkRead.mockReset();
  mockMarkAllRead.mockReset();
  mockRegisterDevice.mockReset();
  mockGetPreferences.mockReset();
  mockUpdatePreferences.mockReset();
});

const mockNotificationsResponse = {
  notifications: [
    {
      id: "n1",
      type: "record_update",
      title: "Task Updated",
      body: "Task #42 was updated",
      read: false,
      createdAt: "2026-01-01T00:00:00Z",
      actionUrl: "/app/tasks/42",
    },
    {
      id: "n2",
      type: "mention",
      title: "You were mentioned",
      body: "Alice mentioned you in a comment",
      read: true,
      createdAt: "2025-12-31T00:00:00Z",
    },
  ],
  unreadCount: 1,
  cursor: undefined,
};

describe("useNotifications", () => {
  it("fetches notifications on mount", async () => {
    mockList.mockResolvedValue(mockNotificationsResponse);

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.notifications[0].title).toBe("Task Updated");
    expect(result.current.notifications[0].read).toBe(false);
    expect(result.current.notifications[1].read).toBe(true);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles error when fetching notifications", async () => {
    mockList.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.error?.message).toBe("Server error");
  });

  it("marks specific notifications as read", async () => {
    mockList.mockResolvedValue(mockNotificationsResponse);
    mockMarkRead.mockResolvedValue({ success: true, readCount: 1 });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.markRead(["n1"]);
    });

    expect(mockMarkRead).toHaveBeenCalledWith(["n1"]);
    // Optimistic update: n1 should now be read
    expect(result.current.notifications[0].read).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it("marks all notifications as read", async () => {
    mockList.mockResolvedValue(mockNotificationsResponse);
    mockMarkAllRead.mockResolvedValue({ success: true, readCount: 1 });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(mockMarkAllRead).toHaveBeenCalled();
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
  });

  it("registers device for push notifications", async () => {
    mockList.mockResolvedValue({ notifications: [], unreadCount: 0 });
    mockRegisterDevice.mockResolvedValue({
      deviceId: "device-123",
      success: true,
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let response: { deviceId: string; success: boolean };
    await act(async () => {
      response = await result.current.registerDevice(
        "expo-push-token-abc",
        "ios",
      );
    });

    expect(mockRegisterDevice).toHaveBeenCalledWith({
      token: "expo-push-token-abc",
      platform: "ios",
    });
    expect(response!.deviceId).toBe("device-123");
  });

  it("fetches notification preferences", async () => {
    mockList.mockResolvedValue({ notifications: [], unreadCount: 0 });
    mockGetPreferences.mockResolvedValue({
      preferences: {
        email: true,
        push: true,
        inApp: true,
        digest: "daily",
      },
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let prefs: Record<string, unknown> | null;
    await act(async () => {
      prefs = await result.current.getPreferences();
    });

    expect(prefs!).toEqual({
      email: true,
      push: true,
      inApp: true,
      digest: "daily",
    });
  });

  it("updates notification preferences", async () => {
    mockList.mockResolvedValue({ notifications: [], unreadCount: 0 });
    mockUpdatePreferences.mockResolvedValue({
      preferences: {
        email: false,
        push: true,
        inApp: true,
        digest: "weekly",
      },
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updatePreferences({ email: false, digest: "weekly" });
    });

    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      email: false,
      digest: "weekly",
    });
  });

  it("supports cursor-based pagination", async () => {
    mockList.mockResolvedValueOnce({
      notifications: [
        {
          id: "n1",
          type: "info",
          title: "First",
          body: "Body",
          read: false,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      unreadCount: 2,
      cursor: "cursor-abc",
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);
  });
});
