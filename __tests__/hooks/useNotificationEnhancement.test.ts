/**
 * Tests for useNotificationEnhancement – validates grouping,
 * read state management, relative timestamps, and unread counts.
 */
import { renderHook, act } from "@testing-library/react-native";

jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({}),
}));

import { useNotificationEnhancement } from "~/hooks/useNotificationEnhancement";
import type { Notification } from "~/hooks/useNotificationEnhancement";

const sampleNotifications: Notification[] = [
  {
    id: "n1",
    title: "New message",
    body: "Hello",
    timestamp: "2026-01-01T00:00:00Z",
    read: false,
    category: "messages",
  },
  {
    id: "n2",
    title: "Task assigned",
    body: "You have a new task",
    timestamp: "2026-01-01T01:00:00Z",
    read: false,
    category: "tasks",
  },
  {
    id: "n3",
    title: "Another message",
    body: "World",
    timestamp: "2026-01-01T02:00:00Z",
    read: true,
    category: "messages",
  },
];

describe("useNotificationEnhancement", () => {
  it("starts with empty groups and zero unread", () => {
    const { result } = renderHook(() => useNotificationEnhancement());

    expect(result.current.groups).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it("groupNotifications groups by category", () => {
    const { result } = renderHook(() => useNotificationEnhancement());

    let groups: ReturnType<typeof result.current.groupNotifications>;
    act(() => {
      groups = result.current.groupNotifications(sampleNotifications);
    });

    expect(groups!).toHaveLength(2);
    expect(groups!.find((g) => g.category === "messages")?.count).toBe(2);
    expect(groups!.find((g) => g.category === "tasks")?.count).toBe(1);
  });

  it("unreadCount reflects unread notifications", () => {
    const { result } = renderHook(() => useNotificationEnhancement());

    act(() => {
      result.current.groupNotifications(sampleNotifications);
    });

    expect(result.current.unreadCount).toBe(2);
  });

  it("markAsRead marks a single notification as read", () => {
    const { result } = renderHook(() => useNotificationEnhancement());

    act(() => {
      result.current.groupNotifications(sampleNotifications);
    });

    act(() => {
      result.current.markAsRead("n1");
    });

    expect(result.current.unreadCount).toBe(1);
    const messagesGroup = result.current.groups.find(
      (g) => g.category === "messages",
    );
    expect(
      messagesGroup?.notifications.find((n) => n.id === "n1")?.read,
    ).toBe(true);
  });

  it("markGroupAsRead marks all in category as read", () => {
    const { result } = renderHook(() => useNotificationEnhancement());

    act(() => {
      result.current.groupNotifications(sampleNotifications);
    });

    act(() => {
      result.current.markGroupAsRead("messages");
    });

    // n1 and n3 (messages) should be read; n2 (tasks) still unread
    expect(result.current.unreadCount).toBe(1);
  });

  it("getRelativeTimestamp returns 'just now' for recent", () => {
    const { result } = renderHook(() => useNotificationEnhancement());

    const now = new Date().toISOString();
    expect(result.current.getRelativeTimestamp(now)).toBe("just now");
  });

  it("getRelativeTimestamp returns minutes ago", () => {
    const { result } = renderHook(() => useNotificationEnhancement());

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(result.current.getRelativeTimestamp(fiveMinAgo)).toBe("5m ago");
  });

  it("getRelativeTimestamp returns hours ago", () => {
    const { result } = renderHook(() => useNotificationEnhancement());

    const twoHoursAgo = new Date(
      Date.now() - 2 * 60 * 60 * 1000,
    ).toISOString();
    expect(result.current.getRelativeTimestamp(twoHoursAgo)).toBe("2h ago");
  });

  it("getRelativeTimestamp returns 'yesterday'", () => {
    const { result } = renderHook(() => useNotificationEnhancement());

    const yesterday = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(result.current.getRelativeTimestamp(yesterday)).toBe("yesterday");
  });

  it("getRelativeTimestamp returns days ago", () => {
    const { result } = renderHook(() => useNotificationEnhancement());

    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(result.current.getRelativeTimestamp(threeDaysAgo)).toBe("3d ago");
  });
});
