import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface WatchMessage {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface UseWatchConnectivityResult {
  /** Whether the watch is connected */
  isConnected: boolean;
  /** Whether a watch is paired */
  isPaired: boolean;
  /** Whether the watch is currently reachable */
  isReachable: boolean;
  /** Send a message to the watch */
  sendMessage: (message: Omit<WatchMessage, "timestamp">) => Promise<void>;
  /** Last received message from the watch */
  lastMessage: WatchMessage | null;
  /** Messages queued for delivery */
  pendingActions: WatchMessage[];
  /** Clear all pending actions */
  clearPendingActions: () => void;
  /** Whether watch connectivity is supported on this platform */
  isSupported: boolean;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for Apple Watch companion app connectivity.
 * Manages watch connection state and message passing.
 *
 * ```ts
 * const { isConnected, sendMessage, pendingActions } = useWatchConnectivity();
 * await sendMessage({ type: "refresh", payload: {} });
 * ```
 */
export function useWatchConnectivity(): UseWatchConnectivityResult {
  const [lastMessage, setLastMessage] = useState<WatchMessage | null>(null);
  const [pendingActions, setPendingActions] = useState<WatchMessage[]>([]);

  const sendMessage = useCallback(
    async (message: Omit<WatchMessage, "timestamp">): Promise<void> => {
      const fullMessage: WatchMessage = {
        ...message,
        timestamp: Date.now(),
      };
      setPendingActions((prev) => [...prev, fullMessage]);
      setLastMessage(fullMessage);
    },
    [],
  );

  const clearPendingActions = useCallback(() => {
    setPendingActions([]);
  }, []);

  return {
    isConnected: false,
    isPaired: false,
    isReachable: false,
    sendMessage,
    lastMessage,
    pendingActions,
    clearPendingActions,
    isSupported: false,
  };
}
