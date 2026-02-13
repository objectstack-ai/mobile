/**
 * Tests for useNotificationCenter – validates notification center
 * filtering, priority sorting, marking read, and bulk actions.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useNotificationCenter, NotificationItem } from "~/hooks/useNotificationCenter";

const sampleNotifications: NotificationItem[] = [
  { id: "n-1", title: "Alert", body: "Server down", timestamp: "2026-01-01T00:00:00Z", read: false, category: "alert", priority: "high" },
  { id: "n-2", title: "Update", body: "Record updated", timestamp: "2026-01-01T01:00:00Z", read: false, category: "update", priority: "low" },
  { id: "n-3", title: "Mention", body: "You were mentioned", timestamp: "2026-01-01T02:00:00Z", read: true, category: "mention", priority: "medium" },
  { id: "n-4", title: "Workflow", body: "Approval needed", timestamp: "2026-01-01T03:00:00Z", read: false, category: "workflow", priority: "high" },
];

describe("useNotificationCenter", () => {
  it("returns empty state initially", () => {
    const { result } = renderHook(() => useNotificationCenter());

    expect(result.current.notifications).toEqual([]);
    expect(result.current.activityFeed).toEqual([]);
    expect(result.current.filtered).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it("sets notifications and computes unread count", () => {
    const { result } = renderHook(() => useNotificationCenter());

    act(() => {
      result.current.setNotifications(sampleNotifications);
    });

    expect(result.current.notifications).toHaveLength(4);
    expect(result.current.unreadCount).toBe(3);
  });

  it("filters by unread only", () => {
    const { result } = renderHook(() => useNotificationCenter());

    act(() => {
      result.current.setNotifications(sampleNotifications);
    });
    act(() => {
      result.current.setFilter({ unreadOnly: true });
    });

    expect(result.current.filtered).toHaveLength(3);
    expect(result.current.filtered.every((n) => !n.read)).toBe(true);
  });

  it("filters by category", () => {
    const { result } = renderHook(() => useNotificationCenter());

    act(() => {
      result.current.setNotifications(sampleNotifications);
    });
    act(() => {
      result.current.setFilter({ categories: ["alert", "workflow"] });
    });

    expect(result.current.filtered).toHaveLength(2);
    expect(result.current.filtered.every((n) => ["alert", "workflow"].includes(n.category))).toBe(true);
  });

  it("filters by priority", () => {
    const { result } = renderHook(() => useNotificationCenter());

    act(() => {
      result.current.setNotifications(sampleNotifications);
    });
    act(() => {
      result.current.setFilter({ priorities: ["high"] });
    });

    expect(result.current.filtered).toHaveLength(2);
    expect(result.current.filtered.every((n) => n.priority === "high")).toBe(true);
  });

  it("sorts filtered results by priority (high first)", () => {
    const { result } = renderHook(() => useNotificationCenter());

    act(() => {
      result.current.setNotifications(sampleNotifications);
    });

    const priorities = result.current.filtered.map((n) => n.priority);
    expect(priorities).toEqual(["high", "high", "medium", "low"]);
  });

  it("marks a notification as read", () => {
    const { result } = renderHook(() => useNotificationCenter());

    act(() => {
      result.current.setNotifications(sampleNotifications);
    });

    expect(result.current.unreadCount).toBe(3);

    act(() => {
      result.current.markAsRead("n-1");
    });

    expect(result.current.unreadCount).toBe(2);
    expect(result.current.notifications.find((n) => n.id === "n-1")?.read).toBe(true);
  });

  it("marks all as read", () => {
    const { result } = renderHook(() => useNotificationCenter());

    act(() => {
      result.current.setNotifications(sampleNotifications);
    });

    act(() => {
      result.current.markAllAsRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
  });

  it("dismisses a notification", () => {
    const { result } = renderHook(() => useNotificationCenter());

    act(() => {
      result.current.setNotifications(sampleNotifications);
    });

    act(() => {
      result.current.dismiss("n-2");
    });

    expect(result.current.notifications).toHaveLength(3);
    expect(result.current.notifications.find((n) => n.id === "n-2")).toBeUndefined();
  });

  it("dismisses all read notifications", () => {
    const { result } = renderHook(() => useNotificationCenter());

    act(() => {
      result.current.setNotifications(sampleNotifications);
    });

    act(() => {
      result.current.dismissAllRead();
    });

    // n-3 was already read, so only 3 remain
    expect(result.current.notifications).toHaveLength(3);
    expect(result.current.notifications.every((n) => !n.read)).toBe(true);
  });

  it("sets activity feed", () => {
    const { result } = renderHook(() => useNotificationCenter());

    const feed = [
      { id: "af-1", userId: "user-1", action: "created", objectType: "task", recordId: "task-1", summary: "Created a task", timestamp: "2026-01-01T00:00:00Z" },
    ];

    act(() => {
      result.current.setActivityFeed(feed);
    });

    expect(result.current.activityFeed).toEqual(feed);
  });
});
