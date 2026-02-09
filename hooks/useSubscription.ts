import { useCallback, useEffect, useRef, useState } from "react";
import { useClient } from "@objectstack/client-react";
import type {
  RealtimeConnectResponse,
  RealtimeSubscribeResponse,
  GetPresenceResponse,
} from "@objectstack/client";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type PresenceStatus = "online" | "away" | "busy" | "offline";

export interface PresenceMember {
  userId: string;
  status: PresenceStatus;
  lastSeen: string;
  metadata?: Record<string, unknown>;
}

export interface UseSubscriptionOptions {
  /** Channel to subscribe to, e.g. "object:tasks" */
  channel: string;
  /** Optional event filter, e.g. ["record.created", "record.updated"] */
  events?: string[];
  /** Callback invoked when a realtime event is received */
  onEvent?: (event: RealtimeEvent) => void;
  /** Whether to auto-connect on mount (default: true) */
  enabled?: boolean;
}

export interface RealtimeEvent {
  type: string;
  data: Record<string, unknown>;
}

export interface UseSubscriptionResult {
  /** Whether the connection is active */
  isConnected: boolean;
  /** The current connection ID */
  connectionId: string | null;
  /** The current subscription ID */
  subscriptionId: string | null;
  /** Error from connection or subscription */
  error: Error | null;
  /** Presence members in the channel */
  presence: PresenceMember[];
  /** Manually connect */
  connect: () => Promise<void>;
  /** Manually disconnect */
  disconnect: () => Promise<void>;
  /** Set own presence state */
  setPresence: (status: PresenceStatus, metadata?: Record<string, unknown>) => Promise<void>;
  /** Fetch current presence members */
  fetchPresence: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for establishing a realtime WebSocket connection and subscribing
 * to channel events via `client.realtime.*`.
 *
 * Handles connection lifecycle, subscription management, and presence.
 */
export function useSubscription(
  options: UseSubscriptionOptions,
): UseSubscriptionResult {
  const { channel, events, onEvent, enabled = true } = options;
  const client = useClient();

  const [isConnected, setIsConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [presence, setPresence] = useState<PresenceMember[]>([]);

  // Keep callback ref stable
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const doConnect = useCallback(async () => {
    setError(null);
    try {
      const result: RealtimeConnectResponse = await client.realtime.connect({
        transport: "websocket",
        channels: [channel],
      });
      setConnectionId(result.connectionId);
      setIsConnected(true);

      // Subscribe to the channel
      const sub: RealtimeSubscribeResponse = await client.realtime.subscribe({
        channel,
        events,
      });
      setSubscriptionId(sub.subscriptionId);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Realtime connection failed"),
      );
      setIsConnected(false);
    }
  }, [client, channel, events]);

  const doDisconnect = useCallback(async () => {
    try {
      if (subscriptionId) {
        await client.realtime.unsubscribe(subscriptionId);
      }
      await client.realtime.disconnect();
    } catch {
      // Best-effort disconnect
    } finally {
      setIsConnected(false);
      setConnectionId(null);
      setSubscriptionId(null);
    }
  }, [client, subscriptionId]);

  const doSetPresence = useCallback(
    async (status: PresenceStatus, metadata?: Record<string, unknown>) => {
      try {
        await client.realtime.setPresence(channel, {
          userId: "current",
          status,
          lastSeen: new Date().toISOString(),
          metadata,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to set presence"),
        );
      }
    },
    [client, channel],
  );

  const doFetchPresence = useCallback(async () => {
    try {
      const result: GetPresenceResponse =
        await client.realtime.getPresence(channel);
      setPresence(result.members);
    } catch {
      // Presence fetch is best-effort
    }
  }, [client, channel]);

  // Auto-connect on mount if enabled; reconnect only when enabled/channel change.
  // doConnect/doDisconnect are intentionally omitted to avoid re-subscribing on
  // every render when the events array or callbacks change.
  useEffect(() => {
    if (enabled) {
      void doConnect();
    }
    return () => {
      void doDisconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, channel]);

  return {
    isConnected,
    connectionId,
    subscriptionId,
    error,
    presence,
    connect: doConnect,
    disconnect: doDisconnect,
    setPresence: doSetPresence,
    fetchPresence: doFetchPresence,
  };
}
