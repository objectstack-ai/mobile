import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  category: string;
  actions?: Array<{ id: string; label: string }>;
}

export interface NotificationGroup {
  category: string;
  count: number;
  notifications: Notification[];
}

export interface UseNotificationEnhancementResult {
  groups: NotificationGroup[];
  groupNotifications: (notifications: Notification[]) => NotificationGroup[];
  markAsRead: (id: string) => void;
  markGroupAsRead: (category: string) => void;
  getRelativeTimestamp: (timestamp: string) => string;
  unreadCount: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function buildGroups(notifications: Notification[]): NotificationGroup[] {
  const map = new Map<string, Notification[]>();
  for (const n of notifications) {
    const list = map.get(n.category) ?? [];
    list.push(n);
    map.set(n.category, list);
  }
  return Array.from(map.entries()).map(([category, items]) => ({
    category,
    count: items.length,
    notifications: items,
  }));
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for enhanced notification grouping and actions.
 *
 * ```ts
 * const { groups, markAsRead, unreadCount } = useNotificationEnhancement();
 * ```
 */
export function useNotificationEnhancement(): UseNotificationEnhancementResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const groups = useMemo(() => buildGroups(notifications), [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const groupNotifications = useCallback(
    (input: Notification[]): NotificationGroup[] => {
      setNotifications(input);
      return buildGroups(input);
    },
    [],
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markGroupAsRead = useCallback((category: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.category === category ? { ...n, read: true } : n)),
    );
  }, []);

  const getRelativeTimestamp = useCallback((timestamp: string): string => {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return "yesterday";
    return `${diffDay}d ago`;
  }, []);

  return {
    groups,
    groupNotifications,
    markAsRead,
    markGroupAsRead,
    getRelativeTimestamp,
    unreadCount,
  };
}
