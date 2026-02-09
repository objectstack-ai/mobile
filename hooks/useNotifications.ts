import { useCallback, useEffect, useState } from "react";
import { useClient } from "@objectstack/client-react";
import type {
  ListNotificationsResponse,
  RegisterDeviceResponse,
  GetNotificationPreferencesResponse,
  UpdateNotificationPreferencesResponse,
} from "@objectstack/client";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, unknown>;
  actionUrl?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  digest: "none" | "daily" | "weekly";
  channels?: Record<
    string,
    { enabled: boolean; email?: boolean; push?: boolean }
  >;
}

export interface UseNotificationsResult {
  /** List of notifications */
  notifications: NotificationItem[];
  /** Number of unread notifications */
  unreadCount: number;
  /** Whether the list is loading */
  isLoading: boolean;
  /** Error that occurred */
  error: Error | null;
  /** Fetch more notifications (cursor pagination) */
  fetchMore: () => Promise<void>;
  /** Whether there are more notifications to load */
  hasMore: boolean;
  /** Mark specific notifications as read */
  markRead: (ids: string[]) => Promise<void>;
  /** Mark all notifications as read */
  markAllRead: () => Promise<void>;
  /** Register device for push notifications */
  registerDevice: (
    token: string,
    platform: "ios" | "android" | "web",
  ) => Promise<RegisterDeviceResponse>;
  /** Get notification preferences */
  getPreferences: () => Promise<NotificationPreferences | null>;
  /** Update notification preferences */
  updatePreferences: (
    prefs: Partial<NotificationPreferences>,
  ) => Promise<UpdateNotificationPreferencesResponse>;
  /** Refetch notifications */
  refetch: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for managing notifications via `client.notifications.*`.
 *
 * Provides notification listing, read/unread management, device
 * registration, and preference management.
 */
export function useNotifications(): UseNotificationsResult {
  const client = useClient();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);

  const fetchNotifications = useCallback(
    async (append = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const result: ListNotificationsResponse =
          await client.notifications.list(
            append ? { cursor, limit: 20 } : { limit: 20 },
          );
        const items: NotificationItem[] = result.notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          read: n.read,
          data: n.data,
          actionUrl: n.actionUrl,
          createdAt: n.createdAt,
        }));

        if (append) {
          setNotifications((prev) => [...prev, ...items]);
        } else {
          setNotifications(items);
        }
        setUnreadCount(result.unreadCount);
        setCursor(result.cursor);
        setHasMore(!!result.cursor);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch notifications"),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [client, cursor],
  );

  const fetchMore = useCallback(async () => {
    if (hasMore) {
      await fetchNotifications(true);
    }
  }, [hasMore, fetchNotifications]);

  const doMarkRead = useCallback(
    async (ids: string[]) => {
      try {
        await client.notifications.markRead(ids);
        setNotifications((prev) =>
          prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - ids.length));
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to mark notifications read"),
        );
      }
    },
    [client],
  );

  const doMarkAllRead = useCallback(async () => {
    try {
      await client.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to mark all notifications read"),
      );
    }
  }, [client]);

  const doRegisterDevice = useCallback(
    async (
      token: string,
      platform: "ios" | "android" | "web",
    ): Promise<RegisterDeviceResponse> => {
      return client.notifications.registerDevice({ token, platform });
    },
    [client],
  );

  const doGetPreferences =
    useCallback(async (): Promise<NotificationPreferences | null> => {
      try {
        const result: GetNotificationPreferencesResponse =
          await client.notifications.getPreferences();
        return result.preferences;
      } catch {
        return null;
      }
    }, [client]);

  const doUpdatePreferences = useCallback(
    async (
      prefs: Partial<NotificationPreferences>,
    ): Promise<UpdateNotificationPreferencesResponse> => {
      return client.notifications.updatePreferences(prefs);
    },
    [client],
  );

  useEffect(() => {
    void fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchMore,
    hasMore,
    markRead: doMarkRead,
    markAllRead: doMarkAllRead,
    registerDevice: doRegisterDevice,
    getPreferences: doGetPreferences,
    updatePreferences: doUpdatePreferences,
    refetch: () => fetchNotifications(false),
  };
}
