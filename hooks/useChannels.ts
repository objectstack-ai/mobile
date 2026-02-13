import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: "public" | "private" | "direct";
  members: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export interface UseChannelsResult {
  /** Available channels */
  channels: Channel[];
  /** Currently active channel */
  activeChannel: Channel | null;
  /** List all channels */
  listChannels: () => Promise<Channel[]>;
  /** Create a new channel */
  createChannel: (name: string, type: "public" | "private", description?: string) => Promise<Channel>;
  /** Join a channel */
  joinChannel: (channelId: string) => Promise<void>;
  /** Leave a channel */
  leaveChannel: (channelId: string) => Promise<void>;
  /** Set the active channel */
  setActiveChannel: (channelId: string) => void;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for channel management — list, create, join, leave
 * via `client.realtime.channels.*`.
 *
 * Implements v1.5 Messaging & Channels feature from roadmap.
 *
 * ```ts
 * const { channels, createChannel, joinChannel } = useChannels();
 * await createChannel("general", "public", "General discussion");
 * ```
 */
export function useChannels(): UseChannelsResult {
  const client = useClient();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannelState] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const listChannels = useCallback(async (): Promise<Channel[]> => {
    setIsLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (client as any).realtime.channels.list();
      setChannels(result);
      return result;
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error("Failed to list channels");
      setError(e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const createChannel = useCallback(
    async (name: string, type: "public" | "private", description?: string): Promise<Channel> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).realtime.channels.create({ name, type, description });
        setChannels((prev) => [result, ...prev]);
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to create channel");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const joinChannel = useCallback(
    async (channelId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client as any).realtime.channels.join(channelId);
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to join channel");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const leaveChannel = useCallback(
    async (channelId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client as any).realtime.channels.leave(channelId);
        setChannels((prev) => prev.filter((c) => c.id !== channelId));
        setActiveChannelState((prev) => (prev?.id === channelId ? null : prev));
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to leave channel");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const setActiveChannel = useCallback(
    (channelId: string) => {
      const channel = channels.find((c) => c.id === channelId) ?? null;
      setActiveChannelState(channel);
    },
    [channels],
  );

  return { channels, activeChannel, listChannels, createChannel, joinChannel, leaveChannel, setActiveChannel, isLoading, error };
}
