import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface NotificationUIConfig {
  position:
    | "top"
    | "bottom"
    | "top_left"
    | "top_right"
    | "bottom_left"
    | "bottom_right";
  maxVisible: number;
  autoDismiss: boolean;
  duration: number;
}

export interface NotificationAction {
  id: string;
  label: string;
  action: string;
  style: "primary" | "secondary" | "destructive";
}

export interface ActiveNotification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  actions?: NotificationAction[];
  dismissible: boolean;
  config?: Partial<NotificationUIConfig>;
}

export interface UseNotificationUIResult {
  /** All notifications including queued */
  notifications: ActiveNotification[];
  /** Current notification UI configuration */
  config: NotificationUIConfig;
  /** Notifications waiting to be shown */
  queue: ActiveNotification[];
  /** Set the notification UI config */
  setConfig: (config: NotificationUIConfig) => void;
  /** Show a notification */
  show: (notification: ActiveNotification) => void;
  /** Dismiss a notification by id */
  dismiss: (id: string) => void;
  /** Dismiss all notifications */
  dismissAll: () => void;
  /** Update an existing notification */
  updateNotification: (
    id: string,
    updates: Partial<ActiveNotification>,
  ) => void;
  /** Visible notifications limited by maxVisible */
  activeNotifications: ActiveNotification[];
  /** Number of queued notifications */
  queuedCount: number;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for SDUI notification rendering from `NotificationSchema`.
 *
 * Implements Phase 25 Notification Protocol.
 *
 * ```ts
 * const { show, dismiss, activeNotifications, queuedCount } =
 *   useNotificationUI();
 * show({
 *   id: "n1", type: "success", title: "Saved",
 *   message: "Record saved", dismissible: true,
 * });
 * dismiss("n1");
 * ```
 */
export function useNotificationUI(): UseNotificationUIResult {
  const [notifications, setNotifications] = useState<ActiveNotification[]>([]);
  const [config, setConfigState] = useState<NotificationUIConfig>({
    position: "top",
    maxVisible: 3,
    autoDismiss: true,
    duration: 5000,
  });

  /* ---- computed --------------------------------------------------- */

  const activeNotifications = useMemo(
    () => notifications.slice(0, config.maxVisible),
    [notifications, config.maxVisible],
  );

  const queue = useMemo(
    () => notifications.slice(config.maxVisible),
    [notifications, config.maxVisible],
  );

  const queuedCount = useMemo(() => queue.length, [queue]);

  /* ---- methods ---------------------------------------------------- */

  const setConfig = useCallback((cfg: NotificationUIConfig) => {
    setConfigState(cfg);
  }, []);

  const show = useCallback((notification: ActiveNotification) => {
    setNotifications((prev) => [...prev, notification]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateNotification = useCallback(
    (id: string, updates: Partial<ActiveNotification>) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      );
    },
    [],
  );

  return {
    notifications,
    config,
    queue,
    setConfig,
    show,
    dismiss,
    dismissAll,
    updateNotification,
    activeNotifications,
    queuedCount,
  };
}
