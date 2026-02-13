import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  category: "system" | "workflow" | "mention" | "update" | "alert";
  priority: "high" | "medium" | "low";
  objectType?: string;
  recordId?: string;
  actions?: Array<{ id: string; label: string; type: string }>;
}

export interface ActivityFeedEntry {
  id: string;
  userId: string;
  action: string;
  objectType: string;
  recordId: string;
  summary: string;
  timestamp: string;
}

export type NotificationFilter = {
  categories?: string[];
  priorities?: string[];
  unreadOnly?: boolean;
};

export interface UseNotificationCenterResult {
  /** All notifications */
  notifications: NotificationItem[];
  /** Activity feed entries */
  activityFeed: ActivityFeedEntry[];
  /** Filtered notifications based on active filter */
  filtered: NotificationItem[];
  /** Total unread count */
  unreadCount: number;
  /** Current filter */
  filter: NotificationFilter;
  /** Set notifications data */
  setNotifications: (items: NotificationItem[]) => void;
  /** Set activity feed data */
  setActivityFeed: (items: ActivityFeedEntry[]) => void;
  /** Update filter */
  setFilter: (filter: NotificationFilter) => void;
  /** Mark a notification as read */
  markAsRead: (id: string) => void;
  /** Mark all notifications as read */
  markAllAsRead: () => void;
  /** Dismiss a notification */
  dismiss: (id: string) => void;
  /** Dismiss all read notifications */
  dismissAllRead: () => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for an enhanced notification center with activity feed,
 * priority sorting, filters, and bulk actions.
 *
 * Implements v1.4 Notification Center feature from roadmap.
 *
 * ```ts
 * const { notifications, filtered, markAsRead, markAllAsRead, setFilter } = useNotificationCenter();
 * setFilter({ unreadOnly: true, priorities: ["high"] });
 * ```
 */
export function useNotificationCenter(): UseNotificationCenterResult {
  const [notifications, setNotificationsState] = useState<NotificationItem[]>([]);
  const [activityFeed, setActivityFeedState] = useState<ActivityFeedEntry[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>({});

  const filtered = useMemo(() => {
    let items = [...notifications];

    if (filter.unreadOnly) {
      items = items.filter((n) => !n.read);
    }
    if (filter.categories && filter.categories.length > 0) {
      items = items.filter((n) => filter.categories!.includes(n.category));
    }
    if (filter.priorities && filter.priorities.length > 0) {
      items = items.filter((n) => filter.priorities!.includes(n.priority));
    }

    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    items.sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));

    return items;
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const setNotifications = useCallback((items: NotificationItem[]) => {
    setNotificationsState(items);
  }, []);

  const setActivityFeed = useCallback((items: ActivityFeedEntry[]) => {
    setActivityFeedState(items);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotificationsState((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotificationsState((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotificationsState((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const dismissAllRead = useCallback(() => {
    setNotificationsState((prev) => prev.filter((n) => !n.read));
  }, []);

  return {
    notifications,
    activityFeed,
    filtered,
    unreadCount,
    filter,
    setNotifications,
    setActivityFeed,
    setFilter,
    markAsRead,
    markAllAsRead,
    dismiss,
    dismissAllRead,
  };
}
